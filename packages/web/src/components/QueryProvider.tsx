'use client';
import { toast } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PropsWithChildren, useState } from 'react';

interface QueryProviderProps extends PropsWithChildren, LanguageType {}

export default function QueryProvider({ children, lng }: QueryProviderProps) {
  const { t } = useTranslation(lng);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: true, staleTime: 1000 * 60 * 5 },
          mutations: {
            onError: () => {
              toast({ title: t('toastTitle.errorSave') });
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
