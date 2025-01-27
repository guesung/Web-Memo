'use client';

import * as Sentry from '@sentry/nextjs';

import { toast } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PropsWithChildren, useState } from 'react';
import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';

interface QueryProviderProps extends PropsWithChildren, LanguageType {}

export default function QueryProvider({ children, lng }: QueryProviderProps) {
  const { t } = useTranslation(lng);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: true, staleTime: 1000 * 60 * 5 },
          mutations: {
            onSuccess: async () => {
              await ExtensionBridge.requestRefetchTheMemos();
            },
            onError: error => {
              toast({ title: t('toastTitle.errorSave') });
              Sentry.captureException(error, {
                level: 'fatal',
              });
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
