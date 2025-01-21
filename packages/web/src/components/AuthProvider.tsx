'use client';

import { NEED_AUTH_PAGES, PATHS } from '@extension/shared/constants';
import { AuthService } from '@extension/shared/utils';
import { getSupabaseClient } from '@extension/shared/utils/web';
import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';

export default function AuthProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isNeedAuthPage = NEED_AUTH_PAGES.includes(pathname);
    if (!isNeedAuthPage) return;

    const checkAuth = async () => {
      const supabaseClient = getSupabaseClient();
      const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();

      if (!isUserLogin) router.replace(PATHS.login);
    };

    checkAuth();
  }, [pathname]);

  return <>{children}</>;
}
