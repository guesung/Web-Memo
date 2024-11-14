'use server';
import { getUser } from '@extension/shared/utils';
import { RefreshButton } from '@src/app/memos/components';
import { getSupabaseClient, signout } from '@src/utils/supabase.server';
import Image from 'next/image';
import Link from 'next/link';

export default async function Header() {
  return (
    <header className="navbar bg-base-100 fixed inset-x-0 z-50 w-full flex-1 shadow-sm">
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
      <Image src="/images/pngs/icon.png" width={28} height={28} alt="icon" />
      <span className="text-xl">웹 메모</span>
    </Link>
  );
}

async function HeaderRight() {
  const supabaseClient = getSupabaseClient();
  const user = await getUser(supabaseClient);

  const isUserLogin = !!user?.data?.user;
  const userAvatarUrl =
    user?.data?.user?.identities?.[0]?.identity_data?.avatar_url ?? '/images/pngs/default_image_user.png';

  if (isUserLogin)
    return (
      <div className="flex gap-2">
        <RefreshButton />
        <div className="btn btn-circle btn-sm">
          <div className="avatar dropdown dropdown-bottom dropdown-end">
            <div className="avatar w-8 rounded-full" tabIndex={0} role="button">
              <Image src={userAvatarUrl} alt="avatar" width={16} height={16} />
            </div>
            <form>
              <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-1 w-40 p-2 shadow">
                <li>
                  <button formAction={signout}>로그아웃</button>
                </li>
              </ul>
            </form>
          </div>
        </div>
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
