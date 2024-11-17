'use server';
import { getUser } from '@extension/shared/utils';
import { ToggleTheme } from '@src/components';
import { Avatar, AvatarFallback, AvatarImage } from '@src/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@src/components/ui/dropdown-menu';
import { getSupabaseClient, signout } from '@src/utils/supabase.server';
import Image from 'next/image';
import Link from 'next/link';
import RefreshButton from './RefreshButton';

export default async function Header() {
  return (
    <header className="bg-background fixed inset-x-0 z-50 flex flex-1 justify-between p-2 shadow-sm">
      <HeaderLeft />
      <HeaderRight />
    </header>
  );
}

function HeaderLeft() {
  return (
    <Link href="/memos">
      <div className="flex h-full items-center gap-2 px-4">
        <Image src="/images/pngs/icon.png" width={16} height={16} alt="logo" className="flex-1" />
        <span className="text-md font-semibold">웹 메모</span>
      </div>
    </Link>
  );
}

async function HeaderRight() {
  const supabaseClient = getSupabaseClient();
  const user = await getUser(supabaseClient);

  const isUserLogin = !!user?.data?.user;
  const userAvatarUrl =
    user?.data?.user?.identities?.[0]?.identity_data?.avatar_url ?? '/images/pngs/default_image_user.png';
  const userName = user?.data?.user?.identities?.[0]?.identity_data?.name;

  if (isUserLogin)
    return (
      <div className="flex gap-2">
        <ToggleTheme />
        <RefreshButton />
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
                <button>로그아웃</button>
              </DropdownMenuLabel>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  return (
    <Link className="btn btn-ghost text-md" href="login">
      로그인
    </Link>
  );
}

function Margin() {
  return <div className="h-16" />;
}

Header.Margin = Margin;
