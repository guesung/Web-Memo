const STORAGE_KEY = "noticeFirstExposures";
const KST_FORMATTER = new Intl.DateTimeFormat("en-US", {
	timeZone: "Asia/Seoul",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

export async function recordFirstNoticeExposure({
	noticeId,
	now = new Date(),
}: {
	noticeId: number;
	now?: Date;
}): Promise<void> {
	const exposures = await readExposures();
	const key = String(noticeId);
	if (exposures[key]) return;

	exposures[key] = { firstViewedDate: getKstDate(now), returnAttempted: false };
	await chrome.storage.local.set({ [STORAGE_KEY]: exposures });
}

export async function claimNoticeReturns({
	now = new Date(),
}: {
	now?: Date;
} = {}): Promise<NoticeReturn[]> {
	const exposures = await readExposures();
	const today = getKstDate(now);
	const returns: NoticeReturn[] = [];

	for (const [id, exposure] of Object.entries(exposures)) {
		if (exposure.returnAttempted) continue;

		const daysSinceView = differenceInDays(today, exposure.firstViewedDate);
		if (daysSinceView < 1 || daysSinceView > 7) continue;

		exposure.returnAttempted = true;
		returns.push({ noticeId: Number(id), daysSinceView });
	}

	if (returns.length > 0) {
		// The marker records an attempt, because analytics delivery is not acknowledged.
		await chrome.storage.local.set({ [STORAGE_KEY]: exposures });
	}

	return returns;
}

function getKstDate(date: Date): string {
	const parts = KST_FORMATTER.formatToParts(date);
	const value = (type: string) =>
		parts.find((part) => part.type === type)?.value;
	return `${value("year")}-${value("month")}-${value("day")}`;
}

function differenceInDays(today: string, firstViewedDate: string): number {
	const todayTime = Date.parse(`${today}T00:00:00Z`);
	const firstTime = Date.parse(`${firstViewedDate}T00:00:00Z`);
	return (todayTime - firstTime) / 86_400_000;
}

async function readExposures(): Promise<Record<string, NoticeExposure>> {
	const result = await chrome.storage.local.get(STORAGE_KEY);
	const stored = result[STORAGE_KEY];
	if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

	return Object.fromEntries(
		Object.entries(stored).filter(([id, value]) => {
			if (!/^\d+$/.test(id) || !value || typeof value !== "object")
				return false;
			const exposure = value as Partial<NoticeExposure>;
			return (
				typeof exposure.firstViewedDate === "string" &&
				/^\d{4}-\d{2}-\d{2}$/.test(exposure.firstViewedDate) &&
				typeof exposure.returnAttempted === "boolean"
			);
		}),
	) as Record<string, NoticeExposure>;
}

interface NoticeExposure {
	firstViewedDate: string;
	returnAttempted: boolean;
}

interface NoticeReturn {
	noticeId: number;
	daysSinceView: number;
}
