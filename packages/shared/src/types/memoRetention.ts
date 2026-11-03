export type MemoRetentionRange = "recent12" | "all";
export type MemoRetentionGranularity = "month" | "quarter";

export interface MemoRetentionParams {
	range?: MemoRetentionRange;
	granularity?: MemoRetentionGranularity;
}

/** KST calendar dates; end is exclusive. */
export interface MemoRetentionPeriod {
	start: string;
	end: string;
}

export interface MemoRetentionCohort {
	periodStart: string;
	periodEnd: string;
	cohortSize: number;
	retainedUsers: number;
	observedUsers: number;
	pendingUsers: number;
	ratePercent: number | null;
	isProvisional: boolean;
}

export interface MemoReturningWriters {
	monthStart: string;
	users: number;
	isProvisional: boolean;
}

export interface MemoRetentionStats {
	asOf: string;
	timezone: "Asia/Seoul";
	cohortRange: MemoRetentionPeriod;
	returningRange: MemoRetentionPeriod;
	cohorts: MemoRetentionCohort[];
	returning: MemoReturningWriters[];
}
