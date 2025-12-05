import { useCallback, useState } from "react";

import useDidMount from "./useDidMount";
import useError from "./useError";

interface UseFetchProps<TData> {
	fetchFn: () => Promise<TData>;
	defaultValue?: TData;
	timeoutMs?: number;
}

type StatusType = "loading" | "success" | "rejected";

export default function useFetch<TData>({
	fetchFn,
	defaultValue,
	timeoutMs = 30000,
}: UseFetchProps<TData>) {
	const [data, setData] = useState<TData | undefined>(defaultValue);
	const [status, setStatus] = useState<StatusType>("loading");
	const { error, setError } = useError();

	const fetch = useCallback(async () => {
		try {
			setStatus("loading");

			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => {
					reject(new Error("Request timed out"));
				}, timeoutMs);
			});

			const data = await Promise.race([fetchFn(), timeoutPromise]);

			setData(data);
			setStatus("success");
		} catch (error) {
			setStatus("rejected");
			setError(error as Error);
		}
	}, [fetchFn, setError, timeoutMs]);

	useDidMount(fetch);

	if (status === "rejected" && error) throw error;
	return {
		data,
		error,
		refetch: fetch,
		status,
		isLoading: status === "loading",
	};
}
