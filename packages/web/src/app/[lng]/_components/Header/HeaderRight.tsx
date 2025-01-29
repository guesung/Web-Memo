'use client';

import { PATHS } from '@extension/shared/constants';
import { useSignoutMutation, useSupabaseUserQuery } from '@extension/shared/hooks';
import { Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ToggleTheme from './ToggleTheme';

export default function HeaderRight({ lng }: LanguageType) {
  const { t } = useTranslation(lng);
  const { data: user } = useSupabaseUserQuery();
  const { mutate: mutateSignout } = useSignoutMutation();
  const router = useRouter();

  const isUserLogin = !!user?.data?.user;

  const userAvatarUrl =
    user?.data?.user?.identities?.[0]?.identity_data?.avatar_url ?? '/images/pngs/default_image_user.png';

  const handleSignoutClick = () => {
    mutateSignout();
    router.push(PATHS.login);
  };

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
            <DropdownMenuLabel>
              <button type="button" onClick={handleSignoutClick}>
                {t('header.logout')}
              </button>
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
