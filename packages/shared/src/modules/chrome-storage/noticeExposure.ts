const STORAGE_PREFIX = "noticeFirstExposure:";
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
	const key = `${STORAGE_PREFIX}${noticeId}`;
	const stored = (await chrome.storage.local.get(key))[key];
	if (stored !== undefined) {
		readExposure(stored);
		return;
	}
	await chrome.storage.local.set({
		[key]: { firstViewedDate: getKstDate(now), returnAttempted: false },
	});
}

export async function claimNoticeReturns({
	now = new Date(),
}: {
	now?: Date;
} = {}): Promise<NoticeReturn[]> {
	const stored = await chrome.storage.local.get(null);
	const today = getKstDate(now);
	const returns: NoticeReturn[] = [];
	const updates: Record<string, NoticeExposure> = {};

	for (const [key, value] of Object.entries(stored)) {
		if (!key.startsWith(STORAGE_PREFIX)) continue;
		const id = key.slice(STORAGE_PREFIX.length);
		if (!/^[1-9]\d*$/.test(id))
			throw new Error("공지 첫 노출 기록 형식이 올바르지 않습니다");
		const exposure = readExposure(value);
		if (exposure.returnAttempted) continue;

		const daysSinceView = differenceInDays(today, exposure.firstViewedDate);
		if (daysSinceView < 1 || daysSinceView > 7) continue;

		updates[key] = { ...exposure, returnAttempted: true };
		returns.push({ noticeId: Number(id), daysSinceView });
	}

	if (returns.length > 0) {
		// The marker records an attempt, because analytics delivery is not acknowledged.
		await chrome.storage.local.set(updates);
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

function readExposure(value: unknown): NoticeExposure {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("공지 첫 노출 기록 형식이 올바르지 않습니다");
	}
	const exposure = value as Partial<NoticeExposure>;
	if (
		typeof exposure.firstViewedDate !== "string" ||
		!/^\d{4}-\d{2}-\d{2}$/.test(exposure.firstViewedDate) ||
		typeof exposure.returnAttempted !== "boolean"
	) {
		throw new Error("공지 첫 노출 기록 형식이 올바르지 않습니다");
	}
	return exposure as NoticeExposure;
}

interface NoticeExposure {
	firstViewedDate: string;
	returnAttempted: boolean;
}

interface NoticeReturn {
	noticeId: number;
	daysSinceView: number;
}
