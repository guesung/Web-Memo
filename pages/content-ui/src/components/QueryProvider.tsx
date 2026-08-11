"use client";
import {
	MutationCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

export default function QueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				// 개별 useMutation의 onError에 덮어써지지 않도록 MutationCache에 등록한다.
				mutationCache: new MutationCache({
					onError: (error) => {
						console.error("Mutation error:", error);
					},
				}),
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
