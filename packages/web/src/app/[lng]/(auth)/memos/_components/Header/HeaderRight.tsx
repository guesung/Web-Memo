'use client';

import { PATHS } from '@extension/shared/constants';
import { useSignoutMutation, useSupabaseUser } from '@extension/shared/hooks';
import { ToggleTheme } from '@src/components';
import { Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function HeaderRight({ lng }: LanguageType) {
  const { t } = useTranslation(lng);
  const { data: user } = useSupabaseUser();
  const { mutate: signout } = useSignoutMutation();
  const router = useRouter();

  const isUserLogin = !!user?.data?.user;

  const userAvatarUrl =
    user?.data?.user?.identities?.[0]?.identity_data?.avatar_url ?? '/images/pngs/default_image_user.png';

  const handleSignoutClick = () => {
    signout(void 0, {
      onSuccess: () => {
        router.push(PATHS.login);
      },
    });
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
