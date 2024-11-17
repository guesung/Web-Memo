'use server';
import { getUser } from '@extension/shared/utils';
import { RefreshButton } from '@src/app/memos/components';
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

export default async function Header() {
  return (
    <header className="navbar bg-background fixed inset-x-0 z-50 w-full flex-1 shadow-sm">
      <div className="navbar-start">
        <HeaderLeft />
      </div>
      <div className="navbar-end">
        <HeaderRight />
      </div>
    </header>
  );
}

function HeaderLeft() {
  return (
    <Link href="/memos" className="btn btn-ghost">
      <Image src="/images/pngs/icon.png" width={16} height={16} alt="logo" />
      <span className="text-md">웹 메모</span>
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
        {/* <ToggleTheme /> */}
        <RefreshButton />
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              <AvatarImage src={userAvatarUrl} alt="@shadcn" />
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
