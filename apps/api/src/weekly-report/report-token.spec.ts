import {
	signClickToken,
	signUnsubscribeToken,
	verifyClickToken,
	verifyUnsubscribeToken,
} from "./report-token.js";

const SECRET = "test-unsubscribe-secret-0123456789abcdef";
const USER_ID = "11111111-2222-4333-8444-555555555555";
const CLICK_PAYLOAD = {
	userId: USER_ID,
	weekStart: "2026-11-16",
	kind: "report",
	position: "memo-1",
	destination: "https://www.webmemo.test/ko/memos?id=1",
} as const;

// 메일을 보내는 Edge Function(_shared/reportToken.ts)이 같은 입력으로 만든 토큰이다.
// 두 구현의 형식이 갈라지면 이미 발송된 메일의 링크가 전부 무효가 되므로 고정값으로 묶어 둔다.
const EDGE_UNSUBSCRIBE_TOKEN =
	"11111111-2222-4333-8444-555555555555.fjFeRiVbAKl_G23OhcpItA-3cvFk5-MmlFQeMtJY9OE";
const EDGE_CLICK_TOKEN =
	"eyJ1IjoiMTExMTExMTEtMjIyMi00MzMzLTg0NDQtNTU1NTU1NTU1NTU1IiwidyI6IjIwMjYtMTEtMTYiLCJrIjoicmVwb3J0IiwicCI6Im1lbW8tMSIsImQiOiJodHRwczovL3d3dy53ZWJtZW1vLnRlc3Qva28vbWVtb3M_aWQ9MSJ9.PS2juApbwMwO-1_PCSRa9EQn2yO6egotf4fqTqTam24";

describe("수신 거부 토큰", () => {
	it("Edge Function이 만든 토큰을 그대로 검증한다", () => {
		expect(verifyUnsubscribeToken(EDGE_UNSUBSCRIBE_TOKEN, SECRET)).toBe(
			USER_ID,
		);
		expect(signUnsubscribeToken(USER_ID, SECRET)).toBe(EDGE_UNSUBSCRIBE_TOKEN);
	});

	it.each([
		["없는 토큰", null],
		["서명이 다른 토큰", `${USER_ID}.wrong-signature`],
		["user_id가 UUID가 아닌 토큰", "not-a-uuid.signature"],
		["조각이 더 붙은 토큰", `${EDGE_UNSUBSCRIBE_TOKEN}.extra`],
	])("%s은 거부한다", (_, token) => {
		expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
	});

	it("다른 키로 만든 토큰은 거부한다", () => {
		const token = signUnsubscribeToken(USER_ID, `${SECRET}-other`);

		expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
	});

	it("다른 사용자의 서명을 붙인 토큰은 거부한다", () => {
		const otherUserId = "99999999-2222-4333-8444-555555555555";
		const signature = EDGE_UNSUBSCRIBE_TOKEN.split(".")[1];

		expect(
			verifyUnsubscribeToken(`${otherUserId}.${signature}`, SECRET),
		).toBeNull();
	});
});

describe("클릭 토큰", () => {
	it("Edge Function이 만든 토큰을 그대로 검증한다", () => {
		expect(verifyClickToken(EDGE_CLICK_TOKEN, SECRET)).toEqual(CLICK_PAYLOAD);
		expect(signClickToken(CLICK_PAYLOAD, SECRET)).toBe(EDGE_CLICK_TOKEN);
	});

	it("내용을 바꾸면 서명이 맞지 않아 거부한다", () => {
		const [, signature] = EDGE_CLICK_TOKEN.split(".");
		const forged = Buffer.from(
			JSON.stringify({
				u: USER_ID,
				w: "2026-11-16",
				k: "report",
				p: "memo-1",
				d: "https://evil.test",
			}),
		).toString("base64url");

		expect(verifyClickToken(`${forged}.${signature}`, SECRET)).toBeNull();
	});

	it("수신 거부 토큰의 서명으로는 클릭 토큰을 만들 수 없다", () => {
		const [data] = EDGE_CLICK_TOKEN.split(".");
		const unsubscribeSignature = signUnsubscribeToken(data, SECRET).split(
			".",
		)[1];

		expect(
			verifyClickToken(`${data}.${unsubscribeSignature}`, SECRET),
		).toBeNull();
	});

	it("필드 형식이 틀린 payload는 서명이 맞아도 거부한다", () => {
		const token = signClickToken(
			{ ...CLICK_PAYLOAD, weekStart: "2026/11/16" },
			SECRET,
		);

		expect(verifyClickToken(token, SECRET)).toBeNull();
	});
});
