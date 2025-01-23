import { AuthService } from '@extension/shared/utils';
import * as Sentry from '@sentry/nextjs';
import { LanguageType } from '@src/modules/i18n';
import { getSupabaseClient } from '@src/modules/supabase/util.server';

interface InitSentryProps extends LanguageType {}

export async function initSentryUserInfo({ lng }: InitSentryProps) {
  const supabase = getSupabaseClient();
  const user = await new AuthService(supabase).getUser();

  Sentry.setUser({
    username: user?.data?.user?.identities?.[0]?.identity_data?.name,
    email: user?.data?.user?.email,
    id: user?.data?.user?.id,
    ip_address: '{{auto}}',
  });
  Sentry.setTag('lng', lng);
}
