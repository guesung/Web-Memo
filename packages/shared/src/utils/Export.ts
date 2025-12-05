import type { GetMemoResponse } from "../types";

export type ExportFormat = "json" | "csv" | "markdown";

export function exportMemosToJSON(memos: GetMemoResponse[]): string {
	const exportData = memos.map((memo) => ({
		id: memo.id,
		title: memo.title,
		content: memo.memo,
		url: memo.url,
		category: memo.category?.name ?? null,
		isWish: memo.isWish,
		createdAt: memo.created_at,
		updatedAt: memo.updated_at,
	}));

	return JSON.stringify(exportData, null, 2);
}

export function exportMemosToCSV(memos: GetMemoResponse[]): string {
	const escapeCSV = (value: string | null | undefined): string => {
		if (value == null) return "";
		const stringValue = String(value);
		if (
			stringValue.includes(",") ||
			stringValue.includes('"') ||
			stringValue.includes("\n")
		) {
			return `"${stringValue.replace(/"/g, '""')}"`;
		}
		return stringValue;
	};

	const headers = [
		"ID",
		"Title",
		"Content",
		"URL",
		"Category",
		"Is Wishlist",
		"Created At",
		"Updated At",
	];

	const rows = memos.map((memo) =>
		[
			memo.id,
			escapeCSV(memo.title),
			escapeCSV(memo.memo),
			escapeCSV(memo.url),
			escapeCSV(memo.category?.name),
			memo.isWish ? "Yes" : "No",
			memo.created_at ?? "",
			memo.updated_at ?? "",
		].join(","),
	);

	return [headers.join(","), ...rows].join("\n");
}

export function exportMemosToMarkdown(memos: GetMemoResponse[]): string {
	const lines: string[] = [
		"# My Memos",
		"",
		`Exported: ${new Date().toISOString()}`,
		"",
		"---",
		"",
	];

	for (const memo of memos) {
		lines.push(`## ${memo.title || "Untitled"}`);
		lines.push("");

		if (memo.category?.name) {
			lines.push(`**Category:** ${memo.category.name}`);
		}

		if (memo.url) {
			lines.push(`**URL:** [${memo.url}](${memo.url})`);
		}

		if (memo.isWish) {
			lines.push("**Wishlist:** Yes");
		}

		if (memo.created_at) {
			lines.push(`**Created:** ${new Date(memo.created_at).toLocaleString()}`);
		}

		if (memo.updated_at) {
			lines.push(`**Updated:** ${new Date(memo.updated_at).toLocaleString()}`);
		}

		lines.push("");

		if (memo.memo) {
			lines.push(memo.memo);
		}

		lines.push("");
		lines.push("---");
		lines.push("");
	}

	return lines.join("\n");
}

export function downloadFile(
	content: string,
	filename: string,
	mimeType: string,
): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}

export function exportMemos(
	memos: GetMemoResponse[],
	format: ExportFormat,
): void {
	const timestamp = new Date().toISOString().split("T")[0];
	let content: string;
	let filename: string;
	let mimeType: string;

	switch (format) {
		case "json":
			content = exportMemosToJSON(memos);
			filename = `memos-${timestamp}.json`;
			mimeType = "application/json";
			break;
		case "csv":
			content = exportMemosToCSV(memos);
			filename = `memos-${timestamp}.csv`;
			mimeType = "text/csv";
			break;
		case "markdown":
			content = exportMemosToMarkdown(memos);
			filename = `memos-${timestamp}.md`;
			mimeType = "text/markdown";
			break;
	}

	downloadFile(content, filename, mimeType);
}
