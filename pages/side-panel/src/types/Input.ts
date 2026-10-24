export interface MemoInput {
	title: string;
	memo: string;
	impression: string;
	actionItem: string;
	isWish: boolean;
	isStar: boolean;
	isReading: boolean;
	categoryId: number | null;
	/** 읽을 계획 날짜(YYYY-MM-DD). 없으면 null */
	plannedDate: string | null;
}
