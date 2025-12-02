"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

export default function QueryProvider({ children }: PropsWithChildren) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					mutations: {
						onError: (error) => {
							console.error("Mutation error:", error);
						},
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
