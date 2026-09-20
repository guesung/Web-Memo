import { SupabaseSessionRequiredError } from "@web-memo/shared/utils/extension";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleEditHighlight } from "./editHighlight";

const MOCKS = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), update: vi.fn(), remove: vi.fn(), report: vi.fn() }));
vi.mock("./reportBackgroundError", () => ({ reportBackgroundError: MOCKS.report }));
vi.mock("@web-memo/shared/utils", () => ({
 normalizeUrl: (url: string) => url,
 HighlightService: class { updateHighlight = MOCKS.update; deleteHighlight = MOCKS.remove; },
}));
vi.mock("@web-memo/shared/utils/extension", () => ({
 getSupabaseClient: MOCKS.getClient, SupabaseSessionRequiredError: class extends Error {},
}));
const URL = "https://example.com/article";
const SENDER = { id: "extension-id", frameId: 0, url: URL, tab: { id: 1, url: URL } } as chrome.runtime.MessageSender;
const PAYLOAD = { id: 1, url: URL, action: "color", color: "pink" };
const ROW = { id: 1, url: URL, user_id: "owner", color: "pink" };

beforeEach(() => {
 vi.stubGlobal("chrome", { runtime: { id: "extension-id" } });
 MOCKS.getClient.mockReset().mockResolvedValue({ auth: { getUser: MOCKS.getUser } });
 MOCKS.getUser.mockReset().mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
 MOCKS.update.mockReset().mockResolvedValue({ data: [ROW], error: null });
 MOCKS.remove.mockReset().mockResolvedValue({ data: [ROW], error: null });
 MOCKS.report.mockReset();
});

describe("하이라이트 편집 요청", () => {
 it("색 변경에 페이지와 인증 사용자 조건을 전달한다", async () => {
  expect(await handleEditHighlight({ payload: PAYLOAD, sender: SENDER })).toEqual({ success: true, highlight: ROW });
  expect(MOCKS.update).toHaveBeenCalledWith({ id: 1, request: { color: "pink" }, scope: { url: URL, userId: "owner" } });
 });
 it("실제 삭제된 행을 확인한다", async () => {
  expect((await handleEditHighlight({ payload: { id: 1, url: URL, action: "delete" }, sender: SENDER })).success).toBe(true);
  expect(MOCKS.remove).toHaveBeenCalledWith(1, { url: URL, userId: "owner" });
  MOCKS.remove.mockResolvedValue({ data: [], error: null });
  expect((await handleEditHighlight({ payload: { id: 1, url: URL, action: "delete" }, sender: SENDER })).success).toBe(false);
 });
 it.each([null, {}, { ...PAYLOAD, color: "red" }, { ...PAYLOAD, id: -1 }, { ...PAYLOAD, url: "https://other.com/" }])("유효하지 않은 요청을 거부한다: %j", async (payload) => {
  expect((await handleEditHighlight({ payload, sender: SENDER })).success).toBe(false);
  expect(MOCKS.getClient).not.toHaveBeenCalled();
 });
 it.each([{ ...SENDER, id: "other" }, { ...SENDER, frameId: 1 }, { ...SENDER, url: "https://other.com/" }])("외부 확장과 iframe을 거부한다", async (sender) => {
  expect((await handleEditHighlight({ payload: PAYLOAD, sender })).success).toBe(false);
  expect(MOCKS.getClient).not.toHaveBeenCalled();
 });
 it.each([{ ...ROW, user_id: "other" }, { ...ROW, url: "https://other.com/" }, { ...ROW, id: 2 }])("소유권과 URL이 다른 반환 행은 성공으로 간주하지 않는다", async (row) => {
  MOCKS.update.mockResolvedValue({ data: [row], error: null });
  expect((await handleEditHighlight({ payload: PAYLOAD, sender: SENDER })).success).toBe(false);
 });
 it("로그인이 없으면 변경하지 않는다", async () => {
  MOCKS.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect(await handleEditHighlight({ payload: PAYLOAD, sender: SENDER })).toEqual({ success: false, error: "unauthenticated" });
  expect(MOCKS.update).not.toHaveBeenCalled();
 });
 it.each([
  { setup: () => MOCKS.update.mockResolvedValue({ data: [], error: { message: "secret SQL" } }), stage: "database_error" },
  { setup: () => MOCKS.update.mockResolvedValue({ data: [], error: null }), stage: "empty_result" },
  { setup: () => MOCKS.getUser.mockResolvedValue({ data: { user: null }, error: { status: 503 } }), stage: "auth_unavailable" },
  { setup: () => MOCKS.getClient.mockRejectedValue(new Error("boom")), stage: "unexpected_error" },
 ])("편집 실패 $stage는 고정 문자열 오류로 Sentry에 보고한다", async ({ setup, stage }) => {
  setup();
  await handleEditHighlight({ payload: PAYLOAD, sender: SENDER });
  expect(MOCKS.report).toHaveBeenCalledTimes(1);
  const params = MOCKS.report.mock.calls[0][0];
  expect(params).toMatchObject({ feature: "highlight", operation: "edit", stage });
  expect(params.error.message).not.toMatch(/secret|boom|example\.com/);
 });
 it.each([
  { setup: () => MOCKS.getClient.mockRejectedValue(new SupabaseSessionRequiredError("로그인")) },
  { setup: () => MOCKS.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } }) },
  { setup: () => MOCKS.getUser.mockResolvedValue({ data: { user: null }, error: null }) },
 ])("로그인 부재처럼 정상적인 실패는 보고하지 않는다", async ({ setup }) => {
  setup();
  await handleEditHighlight({ payload: PAYLOAD, sender: SENDER });
  expect(MOCKS.report).not.toHaveBeenCalled();
 });
});
