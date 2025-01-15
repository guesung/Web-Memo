import { AuthProvider, QueryProvider, ThemeProvider } from '@src/components';
import { LanguageParams, SUPPORTED_LANGUAGES } from '@src/modules/i18n';
import { dir } from 'i18next';
import { PropsWithChildren } from 'react';
import { Header } from './(auth)/memos/_components';

interface RootLayoutProps extends PropsWithChildren, LanguageParams {}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map(lng => ({ lng }));
}

export default function RootLayout({ children, params: { lng } }: RootLayoutProps) {
  return (
    <main lang={lng} dir={dir(lng)}>
      <ThemeProvider>
        <QueryProvider lng={lng}>
          <AuthProvider>
            <Header lng={lng} />
            {children}
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </main>
  );
}
