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

	it("기존 항목 줄 앞뒤에 공백·탭 들여쓰기가 있어도 정상 파싱한다", () => {
		const body = [
			"<!-- ai-followup:start -->",
			"\t- [ ]  탭으로 들여쓴 항목  ",
			"  - [x] 공백으로 들여쓴 항목",
			"<!-- ai-followup:end -->",
		].join("\n");

		const result = upsertFollowupSection({ body, items: ["신규 항목"] });

		expect(result).toContain("- [ ] 탭으로 들여쓴 항목");
		expect(result).toContain("- [x] 공백으로 들여쓴 항목");
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
});
