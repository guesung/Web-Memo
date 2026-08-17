const MAX_RETRY_DELAY_MS = 30000;

export const calculateRetryDelay = (attempt: number): number => {
	if (attempt > 7) {
		return MAX_RETRY_DELAY_MS;
	}

	return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
};
