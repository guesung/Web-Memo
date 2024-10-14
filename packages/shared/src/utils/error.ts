function isErrorWithMessage(error: unknown): error is Error {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function toErrorWithMessage(maybeError: unknown): Error {
  if (isErrorWithMessage(maybeError)) return maybeError;

  if (typeof maybeError === 'string') return new Error(maybeError);
  else return new Error(JSON.stringify(maybeError));
}
export function getErrorMeesage(error: unknown) {
  return toErrorWithMessage(error).message;
}

export class NoMemoError extends Error {
  constructor() {
    super('동일한 메모가 존재하지 않습니다.');
    this.name = 'NoMemoError';
  }
}
export class NoMemoListError extends Error {
  constructor() {
    super('메모 리스트가 존재하지 않습니다.');
    this.name = 'NoMemoError';
  }
}
