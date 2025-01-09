'use client';

import { NEED_AUTH_PAGES, PATHS } from '@extension/shared/constants';
import { AuthService } from '@extension/shared/utils';
import { createBrowserClient } from '@supabase/ssr';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';
import { CONFIG } from '@src/constants';

export default function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const supabaseClient = createBrowserClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
      const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();
      const isNeedAuthPage = NEED_AUTH_PAGES.includes(pathname);

      if (!isUserLogin && isNeedAuthPage) {
        router.replace(PATHS.login);
      }
    };

    checkAuth();
  }, [pathname]);

  return <>{children}</>;
}
