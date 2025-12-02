export class NoMemoError extends Error {
	constructor() {
		super("동일한 메모가 존재하지 않습니다.");
		this.name = "NoMemoError";
	}
}
export class NoMemosError extends Error {
	constructor() {
		super("메모 리스트가 존재하지 않습니다.");
		this.name = "NoMemosError";
	}
}
