/**
 * "HH:MM" 시각을 한국어 표시용으로 나눈다. (예: "19:30" → { period: "오후", clock: "7:30" })
 * @description 00:xx·12:xx는 12시간제로 12로 표시한다.
 */
export function getNotifyTimeParts(time: string): {
	period: string;
	clock: string;
} {
	const [hourText, minuteText] = time.split(":");
	const hour = Number(hourText);

	return {
		period: hour < 12 ? "오전" : "오후",
		clock: `${hour % 12 === 0 ? 12 : hour % 12}:${minuteText}`,
	};
}
