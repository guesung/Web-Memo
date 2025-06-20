import { getQueryClient } from "@src/utils";
import type { FetchQueryOptions } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

interface HydrationBoundaryWrapperProps
	extends PropsWithChildren<FetchQueryOptions> {}

export default async function HydrationBoundaryWrapper({
	children,
	...props
}: HydrationBoundaryWrapperProps) {
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery(props);

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{children}
		</HydrationBoundary>
	);
}
