'use client';
import { useSupabaseUser } from '@extension/shared/hooks';
import * as Sentry from '@sentry/nextjs';

import { Language } from '@src/modules/i18n';
import { useEffect } from 'react';

interface InitSentryUserInfoProps {
  lng?: Language;
}

export default function InitSentryUserInfo({ lng }: InitSentryUserInfoProps) {
  const user = useSupabaseUser();

  useEffect(() => {
    Sentry.setUser({
      username: user?.data?.data?.user?.identities?.[0]?.identity_data?.name,
      email: user?.data?.data?.user?.email,
      id: user?.data?.data?.user?.id,
      ip_address: '{{auto}}',
    });
    Sentry.setTag('lng', lng ?? '');
  }, []);

  return null;
}
