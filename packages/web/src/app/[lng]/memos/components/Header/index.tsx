'use server';

import { PATHS } from '@extension/shared/constants';
import { AuthService } from '@extension/shared/utils';
import { ToggleTheme } from '@src/components';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/server';
import { getSupabaseClient, signout } from '@src/modules/supabase/util.server';
import Image from 'next/image';
import Link from 'next/link';

import RefreshButton from './RefreshButton';

export default async function Header({ lng }: LanguageType) {
  return (
    <header className="bg-background fixed inset-x-0 z-50 flex flex-1 justify-between p-2 shadow-sm">
      <HeaderLeft lng={lng} />
      <HeaderRight lng={lng} />
    </header>
  );
}

async function HeaderLeft({ lng }: LanguageType) {
  const { t } = await useTranslation(lng);

  return (
    <Link href={PATHS.memos}>
      <div className="flex h-full items-center gap-2 px-4">
        <Image src="/images/pngs/icon.png" width={16} height={16} alt="logo" className="flex-1" />
        <span className="text-md font-semibold">{t('common.webMemo')}</span>
      </div>
    </Link>
  );
}

async function HeaderRight({ lng }: LanguageType) {
  const supabaseClient = getSupabaseClient();
  const user = await new AuthService(supabaseClient).getUser();
  const { t } = await useTranslation(lng);

  const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();
  if (!isUserLogin) return;

  const userAvatarUrl =
    user?.data?.user?.identities?.[0]?.identity_data?.avatar_url ?? '/images/pngs/default_image_user.png';
  const userName = user?.data?.user?.identities?.[0]?.identity_data?.name;

  return (
    <div className="flex gap-2">
      <ToggleTheme />
      <RefreshButton lng={lng} />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarImage src={userAvatarUrl} alt="avatar" />
            <AvatarFallback>{userName}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <form action={signout}>
            <DropdownMenuLabel>
              <button>{t('header.logout')}</button>
            </DropdownMenuLabel>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Margin() {
  return <div className="h-16" />;
}

Header.Margin = Margin;
