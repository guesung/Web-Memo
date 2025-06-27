export const escapeCSV = (field: string) => {
	// 필드에 큰따옴표, 쉼표, 개행 문자가 포함되어 있는지 확인한다.
	if (/["\n,]/.test(field)) {
		// 큰따옴표를 두 번 연속된 큰따옴표로 이스케이프한다.
		field = field.replace(/"/g, '""');
		// 전체 필드를 큰따옴표로 감싼다.
		return `"${field}"`;
	}
	return field;
};

export const convertToCSVBlob = <T extends object, K extends keyof T>(
	objList: T[],
) => {
	// 헤더를 생성한다.
	const headers = Object.keys(objList[0]);
	const headerRow = headers.map(escapeCSV).join(",");

	// 데이터 행을 생성한다.
	const rows = objList.map((obj) =>
		headers.map((header) => escapeCSV(String(obj[header as K]))).join(","),
	);

	// 헤더와 데이터 행을 결합한다.
	const csvData = [headerRow, ...rows].join("\n");

	return new Blob([csvData]);
};

export const convertToJSONBlob = <T extends object>(objList: T[]) => {
	const jsonData = JSON.stringify(objList, null, 2);
	return new Blob([jsonData]);
};
