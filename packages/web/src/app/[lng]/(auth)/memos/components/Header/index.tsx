'use server';

import { PATHS } from '@extension/shared/constants';
import { AuthService } from '@extension/shared/utils';
import { ToggleTheme } from '@src/components';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
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
    <div className="flex items-center gap-4">
      <Link href={PATHS.memos}>
        <div className="flex h-full items-center gap-2 px-4">
          <Image src="/images/pngs/icon.png" width={16} height={16} alt="logo" className="flex-1" />
          <span className="text-md font-semibold">{t('common.webMemo')}</span>
        </div>
      </Link>
      <Link href={PATHS.introduce} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        {t('header.introduce')}
      </Link>
      <Link href={PATHS.update} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        {t('header.update')}
      </Link>
    </div>
  );
}

async function HeaderRight({ lng }: LanguageType) {
  const { t } = await useTranslation(lng);
  const supabaseClient = getSupabaseClient();
  const user = await new AuthService(supabaseClient).getUser();

  const isUserLogin = await new AuthService(supabaseClient).checkUserLogin();

  const userAvatarUrl =
    user?.data?.user?.identities?.[0]?.identity_data?.avatar_url ?? '/images/pngs/default_image_user.png';
  const userName = user?.data?.user?.identities?.[0]?.identity_data?.name;

  return (
    <div className="flex items-center gap-2">
      <ToggleTheme />
      {isUserLogin && (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="h-8 w-8">
              <Image src={userAvatarUrl} alt="avatar" width={32} height={32} />
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
      )}
    </div>
  );
}

function Margin() {
  return <div className="h-16" />;
}

Header.Margin = Margin;
