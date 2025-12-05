function isErrorWithMessage(error: unknown): error is Error {
	return (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as Record<string, unknown>).message === "string"
	);
}

export function toErrorWithMessage(maybeError: unknown): Error {
	if (isErrorWithMessage(maybeError)) return maybeError;

	if (typeof maybeError === "string") return new Error(maybeError);
	else return new Error(JSON.stringify(maybeError));
}
export function getErrorMessage(error: unknown) {
	return toErrorWithMessage(error).message;
}

/**
 * @deprecated Use getErrorMessage instead (typo fix)
 */
export const getErrorMeesage = getErrorMessage;
