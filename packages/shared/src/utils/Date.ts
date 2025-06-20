type DateFormat = "yyyy.mm.dd" | "mm/dd";

export function formatDate(inputDate: Date, format: DateFormat): string;
export function formatDate(inputDate: string, format: DateFormat): string;
export function formatDate(
	inputDate: Date | string,
	format: DateFormat,
): string {
	if (typeof inputDate === "string") inputDate = new Date(inputDate);

	const year = inputDate.getFullYear();
	const month = inputDate.getMonth() + 1;
	const date = inputDate.getDate();

	if (format === "yyyy.mm.dd")
		return `${year}.${String(month).padStart(2, "0")}.${String(date).padStart(2, "0")}`;
	if (format === "mm/dd") return `${month}/${date}`;

	throw new Error("Invalid date format");
}
