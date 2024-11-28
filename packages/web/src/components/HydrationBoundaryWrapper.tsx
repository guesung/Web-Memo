import { getQueryClient } from '@src/utils';
import { dehydrate, FetchQueryOptions, HydrationBoundary } from '@tanstack/react-query';
import { PropsWithChildren } from 'react';

interface HydrationBoundaryWrapperProps extends PropsWithChildren<FetchQueryOptions> {}

export default async function HydrationBoundaryWrapper({ children, ...props }: HydrationBoundaryWrapperProps) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(props);

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
