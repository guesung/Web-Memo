/** 주간 코호트 표의 한 칸. 아직 끝나지 않은 주는 칸 자체가 null이다. */
export interface WeeklyRetentionCell {
	/** 코호트 주에서 몇 주 뒤인지 */
	offset: number;
	/** 그 주에 활동한 인원 */
	activeUsers: number;
	/** 활동 인원 / 코호트 인원(%, 반올림) */
	percent: number;
}

/** 주간 코호트 표의 한 행. `cells[offset]`이 offset주 뒤 칸이다. */
export interface WeeklyCohortRow {
	/** 코호트 주의 시작일(YYYY-MM-DD) */
	week: string;
	size: number;
	cells: (WeeklyRetentionCell | null)[];
}

/** 월별 막대 하나. */
export interface MonthlyRewriteBar {
	/** YY-MM */
	label: string;
	newWriters: number;
	rewriters: number;
	/** 재작성률(%) */
	percent: number;
	/** 30일이 아직 지나지 않은 달 */
	incomplete: boolean;
	/** 신규 작성자가 적어 해석에 주의해야 하는 달 */
	small: boolean;
}

/** 연·분기. */
export interface YearQuarter {
	year: number;
	quarter: number;
}

/** 분기 묶음 하나의 합산 재작성률. */
export interface QuarterSummary {
	from: YearQuarter;
	to: YearQuarter;
	newWriters: number;
	rewriters: number;
	percent: number;
}
