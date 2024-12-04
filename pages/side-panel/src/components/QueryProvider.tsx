'use client';
import { I18n } from '@extension/shared/utils/extension';
import { useToast } from '@extension/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PropsWithChildren, useState } from 'react';

export default function QueryProvider({ children }: PropsWithChildren) {
  const { toast } = useToast();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: true },
          mutations: {
            onError: () => {
              toast({ title: I18n.get('toast_error_save') });
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
