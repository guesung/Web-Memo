import { dehydrate, FetchQueryOptions, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';

interface HydrationBoundaryWrapperProps extends PropsWithChildren<FetchQueryOptions> {}

export default async function HydrationBoundaryWrapper({ children, ...props }: HydrationBoundaryWrapperProps) {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(props);

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
