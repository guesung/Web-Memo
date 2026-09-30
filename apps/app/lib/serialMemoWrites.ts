const queues = new Map<string, Promise<unknown>>();

/** 같은 저장 대상의 읽기·검증·쓰기를 하나씩 실행한다. */
export function serialMemoWrite<T>(key: string, operation: () => Promise<T>) {
	const previous = queues.get(key) ?? Promise.resolve();
	const result = previous.catch(() => undefined).then(operation);
	queues.set(key, result);
	void result
		.finally(() => {
			if (queues.get(key) === result) queues.delete(key);
		})
		.catch(() => undefined);
	return result;
}
