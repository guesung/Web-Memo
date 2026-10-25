import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";

/** 첫 컬럼을 고유 키로 사용하여 탭과 헤더를 보장하고 행을 멱등 저장합니다. 호출자는 동시 쓰기를 직렬화해야 합니다. */
export const upsertGoogleSheetTables = async ({
	spreadsheetId,
	serviceAccount,
	tables,
	fetcher = fetch,
	tokenExchanger = exchangeServiceAccountToken,
	sleep = (milliseconds) =>
		new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) => {
	if (tables.length === 0) {
		return { updatedRows: 0 };
	}
	validateTables(tables);
	const accessToken = await tokenExchanger({
		serviceAccount,
		scope: "https://www.googleapis.com/auth/spreadsheets",
	});
	const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
	const request = async (path, body) =>
		await requestSheets({
			url: `${endpoint}${path}`,
			body,
			accessToken,
			fetcher,
			sleep,
		});
	const spreadsheet = await request("?fields=sheets.properties");
	const propertiesByTitle = new Map(
		(spreadsheet.sheets ?? []).map((sheet) => [
			sheet.properties.title,
			sheet.properties,
		]),
	);
	const missing = tables.filter((table) => !propertiesByTitle.has(table.title));
	if (missing.length > 0) {
		const created = await request(":batchUpdate", {
			requests: missing.map((table) => ({
				addSheet: {
					properties: {
						title: table.title,
						gridProperties: {
							rowCount: Math.max(1000, table.rows.length + 1),
							columnCount: Math.max(26, table.headers.length),
						},
					},
				},
			})),
		});
		for (const reply of created.replies ?? []) {
			const properties = reply.addSheet?.properties;
			if (properties) {
				propertiesByTitle.set(properties.title, properties);
			}
		}
	}
	const query = new URLSearchParams();
	for (const table of tables) {
		query.append("ranges", `${quoteTitle(table.title)}!1:1`);
		query.append("ranges", `${quoteTitle(table.title)}!A2:A`);
	}
	const existing = await request(`/values:batchGet?${query}`);
	const data = [];
	const resizeRequests = [];
	let updatedRows = 0;
	for (const [index, table] of tables.entries()) {
		const header = existing.valueRanges?.[index * 2]?.values?.[0] ?? [];
		const matchesCurrentHeader =
			JSON.stringify(header) === JSON.stringify(table.headers);
		const matchesLegacyHeader =
			table.legacyHeaders &&
			JSON.stringify(header) === JSON.stringify(table.legacyHeaders);
		if (header.length > 0 && !matchesCurrentHeader && !matchesLegacyHeader) {
			throw new Error(`Google Sheets header mismatch: ${table.title}`);
		}
		if (!matchesCurrentHeader) {
			data.push({
				range: `${quoteTitle(table.title)}!A1`,
				values: [table.headers],
			});
		}
		const keys = existing.valueRanges?.[index * 2 + 1]?.values ?? [];
		const rowByKey = new Map();
		for (const [offset, cells] of keys.entries()) {
			if (cells[0] !== undefined && cells[0] !== "") {
				const key = String(cells[0]);
				if (rowByKey.has(key)) {
					throw new Error(
						`Google Sheets duplicate existing key: ${table.title}`,
					);
				}
				rowByKey.set(key, offset + 2);
			}
		}
		let nextRow = keys.length + 2;
		for (const row of table.rows) {
			const key = String(row[0]);
			const rowNumber = rowByKey.get(key) ?? nextRow++;
			rowByKey.set(key, rowNumber);
			data.push({
				range: `${quoteTitle(table.title)}!A${rowNumber}`,
				values: [row],
			});
			updatedRows += 1;
		}
		const properties = propertiesByTitle.get(table.title);
		if (
			properties &&
			(nextRow - 1 > properties.gridProperties.rowCount ||
				table.headers.length > properties.gridProperties.columnCount)
		) {
			resizeRequests.push({
				updateSheetProperties: {
					properties: {
						sheetId: properties.sheetId,
						gridProperties: {
							rowCount: Math.max(
								nextRow - 1,
								properties.gridProperties.rowCount,
							),
							columnCount: Math.max(
								table.headers.length,
								properties.gridProperties.columnCount,
							),
						},
					},
					fields: "gridProperties.rowCount,gridProperties.columnCount",
				},
			});
		}
	}
	if (resizeRequests.length > 0) {
		await request(":batchUpdate", { requests: resizeRequests });
	}
	if (data.length > 0) {
		await request("/values:batchUpdate", { valueInputOption: "RAW", data });
	}

	return { updatedRows };
};

const quoteTitle = (title) => `'${title.replaceAll("'", "''")}'`;

const validateTables = (tables) => {
	const titles = new Set();
	for (const table of tables) {
		if (!table.title || titles.has(table.title) || table.headers.length === 0) {
			throw new Error(
				"Google Sheets tables must have unique titles and headers",
			);
		}
		titles.add(table.title);
		if (
			table.legacyHeaders &&
			table.legacyHeaders.length !== table.headers.length
		) {
			throw new Error(
				`Google Sheets legacy header width mismatch: ${table.title}`,
			);
		}
		const keys = new Set();
		for (const row of table.rows) {
			if (
				!row[0] ||
				keys.has(String(row[0])) ||
				row.length !== table.headers.length
			) {
				throw new Error(
					`Google Sheets invalid row or duplicate key: ${table.title}`,
				);
			}
			keys.add(String(row[0]));
		}
	}
};

const requestSheets = async ({ url, body, accessToken, fetcher, sleep }) => {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const response = await fetcher(url, {
			method: body ? "POST" : "GET",
			headers: {
				authorization: `Bearer ${accessToken}`,
				"content-type": "application/json",
			},
			...(body ? { body: JSON.stringify(body) } : {}),
		});
		if (response.ok) {
			return await response.json();
		}
		if ((response.status === 429 || response.status >= 500) && attempt < 2) {
			await sleep(1000 * 2 ** attempt);
			continue;
		}
		throw new Error(`Google Sheets API request failed (${response.status})`);
	}
};
