export type TSupportStatus =
	| "supported"
	| "partial"
	| "unsupported"
	| "unknown";

export type TCompareProductKey =
	| "webMemo"
	| "notionWebClipper"
	| "liner"
	| "glasp"
	| "googleKeep";

export interface IFCompareProductFact {
	key: TCompareProductKey;
	sources: { url: string }[];
}

export interface IFCompareCriterionFact {
	key: string;
	cells: Record<TCompareProductKey, { status: TSupportStatus }>;
}

export interface IFCompareProduct extends IFCompareProductFact {
	name: string;
	identity: string;
	sources: { label: string; url: string }[];
}

export interface IFCompareCriterion {
	key: string;
	label: string;
	cells: Record<
		TCompareProductKey,
		{ status: TSupportStatus; description: string }
	>;
}

export interface IFCompareRecommendation {
	situation: string;
	productName: string;
	note?: string;
}
