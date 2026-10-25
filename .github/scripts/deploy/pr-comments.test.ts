import { afterEach, describe, expect, it, vi } from "vitest";
import {
	buildExtensionCommentBody,
	EXTENSION_COMMENT_MARKER,
	findExtensionComment,
	upsertExtensionComment,
} from "./pr-comments.mjs";

const RUN_URL = "https://github.com/guesung/Web-Memo/actions/runs/123";
const DOWNLOAD_URL = `${RUN_URL}/artifacts/456`;

describe("findExtensionComment", () => {
	it("마커가 든 봇 댓글을 찾는다", () => {
		expect(
			findExtensionComment([
				{ id: 1, body: "리뷰 부탁드립니다", user: { type: "User" } },
				{ id: 2, body: `${EXTENSION_COMMENT_MARKER}\n빌드`, user: { type: "Bot" } },
			]),
		).toMatchObject({ id: 2 });
	});

	// 사람이 마커를 인용한 댓글을 봇이 덮어쓰면 그 사람의 글이 사라진다
	it("사람이 쓴 댓글은 마커가 있어도 고르지 않는다", () => {
		expect(
			findExtensionComment([
				{ id: 1, body: EXTENSION_COMMENT_MARKER, user: { type: "User" } },
			]),
		).toBeNull();
	});

	it("마커 없는 봇 댓글만 있으면 null이다", () => {
		expect(
			findExtensionComment([{ id: 1, body: "다른 봇", user: { type: "Bot" } }]),
		).toBeNull();
		expect(findExtensionComment([])).toBeNull();
	});
});

describe("buildExtensionCommentBody", () => {
	it("성공하면 다운로드 링크와 설치 방법을 담는다", () => {
		const body = buildExtensionCommentBody({
			outcome: "success",
			commitSha: "abcdef1234567",
			runUrl: RUN_URL,
			artifactName: "extension-production-v1.10.14",
			downloadUrl: DOWNLOAD_URL,
		});

		expect(body.startsWith(EXTENSION_COMMENT_MARKER)).toBe(true);
		expect(body).toContain("`abcdef1`");
		expect(body).toContain(
			`[⬇️ extension-production-v1.10.14 다운로드](${DOWNLOAD_URL})`,
		);
		expect(body).toContain("chrome://extensions");
	});

	it("성공했지만 링크가 없으면 워크플로로 안내한다", () => {
		const body = buildExtensionCommentBody({
			outcome: "success",
			commitSha: "abcdef1234567",
			runUrl: RUN_URL,
		});

		expect(body).toContain("다운로드 링크를 찾지 못했습니다");
		expect(body).toContain(RUN_URL);
		expect(body).not.toContain("⬇️");
	});

	// 직전 커밋의 다운로드 링크가 최신 빌드처럼 남으면 안 된다
	it("실패하면 다운로드 링크 없이 실패와 로그 링크만 담는다", () => {
		const body = buildExtensionCommentBody({
			outcome: "failure",
			commitSha: "abcdef1234567",
			runUrl: RUN_URL,
			downloadUrl: DOWNLOAD_URL,
		});

		expect(body.startsWith(EXTENSION_COMMENT_MARKER)).toBe(true);
		expect(body).toContain("확장 빌드 실패");
		expect(body).not.toContain(DOWNLOAD_URL);
	});
});

describe("upsertExtensionComment", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const params = {
		apiUrl: "https://api.example.test",
		repository: "guesung/Web-Memo",
		prNumber: "7",
		token: "t0ken",
		body: "새 본문",
	};

	const respond = (data: unknown) => ({ ok: true, json: async () => data });

	it("기존 댓글이 있으면 그 댓글을 고쳐 쓴다", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				respond([{ id: 9, body: EXTENSION_COMMENT_MARKER, user: { type: "Bot" } }]),
			)
			.mockResolvedValueOnce(respond({}));
		vi.stubGlobal("fetch", fetchMock);

		expect(await upsertExtensionComment(params)).toBe("updated");
		expect(fetchMock.mock.calls[1][0]).toBe(
			"https://api.example.test/repos/guesung/Web-Memo/issues/comments/9",
		);
		expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ body: "새 본문" });
	});

	it("기존 댓글이 없으면 새로 단다", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(respond([]))
			.mockResolvedValueOnce(respond({}));
		vi.stubGlobal("fetch", fetchMock);

		expect(await upsertExtensionComment(params)).toBe("created");
		expect(fetchMock.mock.calls[1][0]).toBe(
			"https://api.example.test/repos/guesung/Web-Memo/issues/7/comments",
		);
		expect(fetchMock.mock.calls[1][1].method).toBe("POST");
	});

	it("댓글이 100개를 넘으면 다음 페이지까지 읽어 찾는다", async () => {
		const firstPage = Array.from({ length: 100 }, (_, index) => ({
			id: index,
			body: "잡담",
			user: { type: "User" },
		}));
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(respond(firstPage))
			.mockResolvedValueOnce(
				respond([{ id: 200, body: EXTENSION_COMMENT_MARKER, user: { type: "Bot" } }]),
			)
			.mockResolvedValueOnce(respond({}));
		vi.stubGlobal("fetch", fetchMock);

		expect(await upsertExtensionComment(params)).toBe("updated");
		expect(fetchMock.mock.calls[1][0]).toContain("page=2");
		expect(fetchMock.mock.calls[2][0]).toContain("/issues/comments/200");
	});
});
