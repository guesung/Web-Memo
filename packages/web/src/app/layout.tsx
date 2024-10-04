import { Inter } from 'next/font/google';
import './globals.css';
import { Header, QueryProvider } from '@src/components';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="bg-base-100 h-screen" data-theme="cupcake">
      <body className={`${inter.className} h-full`}>
        <QueryProvider>
          <Header />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
