import type { MemoRetentionPeriod } from "@web-memo/shared/types";

const toDate = (date: string) =>
	/^\d{4}-\d{2}-\d{2}$/.test(date)
		? new Date(`${date}T00:00:00+09:00`)
		: new Date(date);

export const formatRetentionDate = (date: string, lng: string) =>
	new Intl.DateTimeFormat(lng, {
		timeZone: "Asia/Seoul",
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(toDate(date));

export const formatRetentionRange = (
	period: MemoRetentionPeriod,
	lng: string,
) => {
	const lastDay = new Date(
		toDate(period.end).getTime() - 86400000,
	).toISOString();
	return `${formatRetentionDate(period.start, lng)} – ${formatRetentionDate(lastDay, lng)}`;
};
