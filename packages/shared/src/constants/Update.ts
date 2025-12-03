import packageJson from "../../../../package.json";

export const CURRENT_VERSION = packageJson.version;

const UPDATE_NOTES: Record<string, UpdateNotes> = {
	"1.9": {
		ko: [
			"AI 기반 카테고리 자동 추천 기능 추가",
			"랜딩 페이지 전면 리디자인",
			"드래그로 메모 추가 기능",
		],
		en: [
			"AI-powered category auto-recommendation",
			"Landing page redesign",
			"Add memo by drag and drop",
		],
	},
};

export function getUpdateNotes(language: "ko" | "en"): string[] {
	const [major, minor] = CURRENT_VERSION.split(".");
	const key = `${major}.${minor}`;
	return UPDATE_NOTES[key]?.[language] ?? [];
}

interface UpdateNotes {
	ko: string[];
	en: string[];
}
