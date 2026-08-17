import { describe, expect, it } from "vitest";
import { upsertFollowupSection } from "./followup.ts";

describe("upsertFollowupSection", () => {
	it("마커가 없으면 본문 끝에 섹션을 새로 만든다", () => {
		const result = upsertFollowupSection({
			body: "## 작업 내용\n\n메모 목록 캐시 개선",
			items: ["캐시 무효화 범위 축소"],
		});

		expect(result).toContain("## 작업 내용\n\n메모 목록 캐시 개선");
		expect(result).toContain("<!-- ai-followup:start -->");
		expect(result).toContain("- [ ] 캐시 무효화 범위 축소");
		expect(result).toContain("<!-- ai-followup:end -->");
	});

	it("마커 사이 구간만 교체하고 앞뒤 본문은 보존한다", () => {
		const body = [
			"## 작업 내용",
			"앞부분",
			"<!-- ai-followup:start -->",
			"## 🔭 후속 작업 (시니어 리뷰)",
			"",
			"- [ ] 기존 항목",
			"<!-- ai-followup:end -->",
			"## 참고",
			"뒷부분",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("## 작업 내용\n앞부분");
		expect(result).toContain("## 참고\n뒷부분");
		expect(result.match(/ai-followup:start/g)).toHaveLength(1);
	});

	it("기존 항목에 신규 항목을 누적한다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"## 🔭 후속 작업 (시니어 리뷰)",
			"",
			"- [ ] 기존 항목",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("- [ ] 기존 항목");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("이미 있는 항목은 중복 추가하지 않는다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [ ] 캐시 무효화 범위 축소",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["캐시 무효화 범위 축소"] });

		expect(result.match(/캐시 무효화 범위 축소/g)).toHaveLength(1);
	});

	it("체크 완료된 기존 항목의 상태를 보존한다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [x] 이미 처리한 항목",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("- [x] 이미 처리한 항목");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("체크 완료된 항목과 같은 내용이 신규로 들어와도 중복 추가하지 않는다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [x] 캐시 무효화 범위 축소",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["캐시 무효화 범위 축소"] });

		expect(result.match(/캐시 무효화 범위 축소/g)).toHaveLength(1);
		expect(result).toContain("- [x] 캐시 무효화 범위 축소");
	});

	it("start 마커만 있고 end가 없으면 덮어쓰지 않고 끝에 새로 만든다", () => {
		const body = "본문\n<!-- ai-followup:start -->\n- [ ] 손상된 섹션";

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("- [ ] 손상된 섹션");
		expect(result).toContain("<!-- ai-followup:end -->");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("items가 비면 본문을 그대로 반환한다", () => {
		const body = "## 작업 내용\n변경 없음";

		expect(upsertFollowupSection({ body, items: [] })).toBe(body);
	});

	it("빈 본문에도 섹션을 만든다", () => {
		const result = upsertFollowupSection({ body: "", items: ["항목"] });

		expect(result).toContain("- [ ] 항목");
	});

	it("기존 항목 줄 앞뒤에 공백·탭 들여쓰기가 있어도 정상 파싱하고 원문은 그대로 보존한다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"\t- [ ]  탭으로 들여쓴 항목  ",
			"  - [x] 공백으로 들여쓴 항목",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("\t- [ ]  탭으로 들여쓴 항목  ");
		expect(result).toContain("  - [x] 공백으로 들여쓴 항목");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("CRLF 줄바꿈으로 이루어진 본문도 항목을 정상 누적한다", () => {
		const body = [
			"## 작업 내용",
			"앞부분",
			"<!-- ai-followup:start -->",
			"## 🔭 후속 작업 (시니어 리뷰)",
			"",
			"- [ ] 기존 항목",
			"<!-- ai-followup:end -->",
			"## 참고",
			"뒷부분",
		].join("\r\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("- [ ] 기존 항목");
		expect(result).toContain("- [ ] 신규 항목");
		expect(result).toContain("앞부분");
		expect(result).toContain("뒷부분");
		expect(result.match(/ai-followup:start/g)).toHaveLength(1);
	});

	it("신규 항목 문자열 앞뒤 공백은 기존 트림된 항목과 동일하게 취급해 중복 추가하지 않는다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [ ] 캐시 무효화 범위 축소",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({
			body,
			items: ["  캐시 무효화 범위 축소  "],
		});

		expect(result.match(/캐시 무효화 범위 축소/g)).toHaveLength(1);
	});

	it("end 마커가 start 마커보다 앞에 있는 순서 오류에서도 기존 내용을 파괴하지 않는다", () => {
		const body = [
			"## 작업 내용",
			"소중한 내용",
			"<!-- ai-followup:end -->",
			"<!-- ai-followup:start -->",
			"- [ ] 뒤엉킨 항목",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("소중한 내용");
		expect(result).toContain("- [ ] 뒤엉킨 항목");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("체크박스처럼 보이는 마크다운을 포함한 항목도 그대로 하나의 항목으로 추가한다", () => {
		const body = "<!-- ai-followup:start -->\n<!-- ai-followup:end -->";

		const result = upsertFollowupSection({
			body,
			items: ["- [ ] 체크박스처럼 보이는 항목"],
		});

		expect(result).toContain("- [ ] - [ ] 체크박스처럼 보이는 항목");

		const reapplied = upsertFollowupSection({
			body: result,
			items: ["- [ ] 체크박스처럼 보이는 항목"],
		});

		expect(reapplied.match(/체크박스처럼 보이는 항목/g)).toHaveLength(1);
	});

	it("체크박스 항목 뒤에 이어지는 산문 줄은 재실행 후에도 보존된다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [ ] 기존 항목",
			"이 항목은 다음 스프린트로 미룬 이유가 있다.",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("이 항목은 다음 스프린트로 미룬 이유가 있다.");
		expect(result).toContain("- [ ] 기존 항목");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("섹션 내 커스텀 소제목은 재실행 후에도 보존된다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"### 보류",
			"- [ ] 검토 필요",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("### 보류");
		expect(result).toContain("- [ ] 검토 필요");
		expect(result).toContain("- [ ] 신규 항목");
	});

	it("대괄호 앞에 공백이 두 칸인 기존 항목도 동일 항목으로 인식해 중복 추가하지 않는다", () => {
		const body = ["<!-- ai-followup:start -->", "-  [ ] 기존", "<!-- ai-followup:end -->"].join(
			"\n",
		);

		const result = upsertFollowupSection({ body, items: ["기존"] });

		expect(result.match(/기존/g)).toHaveLength(1);
		expect(result).toBe(body);
	});

	it("기존 항목이 * 불릿으로 작성돼 있어도 동일 항목으로 인식해 중복 추가하지 않는다", () => {
		const body = ["<!-- ai-followup:start -->", "* [ ] 기존", "<!-- ai-followup:end -->"].join(
			"\n",
		);

		const result = upsertFollowupSection({ body, items: ["기존"] });

		expect(result.match(/기존/g)).toHaveLength(1);
		expect(result).toBe(body);
	});

	it("기존 항목과 신규 항목의 내부 공백 개수가 달라도 동일 항목으로 인식해 중복 추가하지 않는다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [ ] 캐시   무효화",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["캐시 무효화"] });

		expect(result.match(/캐시\s+무효화/g)).toHaveLength(1);
		expect(result).toBe(body);
	});

	it("기존 항목과 신규 항목이 대소문자만 다르면 동일 항목으로 인식해 중복 추가하지 않는다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [ ] Fix Cache Invalidation",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["fix cache invalidation"] });

		expect(result.match(/Fix Cache Invalidation/gi)).toHaveLength(1);
		expect(result).toBe(body);
	});

	it("전달된 모든 항목이 이미 존재하면 본문을 바이트 단위로 그대로 반환한다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [ ] 첫 번째 항목",
			"- [x] 두 번째 항목",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({
			body,
			items: ["  두 번째 항목  ", "첫 번째 항목"],
		});

		expect(result).toBe(body);
	});

	it("사람이 하위 불릿으로 들여쓴 기존 항목은 재실행 후에도 들여쓰기가 유지된다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"- [ ] 상위 항목",
			"  - [ ] 하위 세부 항목",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("  - [ ] 하위 세부 항목");
		expect(result).toContain("- [ ] 신규 항목");
	});
});
