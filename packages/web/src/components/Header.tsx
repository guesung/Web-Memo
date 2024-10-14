'use server';
import { getUser } from '@extension/shared/utils';
import { MemoRefresh } from '@src/app/memos/components';
import { getSupabaseClient, signout } from '@src/utils/supabase.server';
import Image from 'next/image';
import Link from 'next/link';

export default async function Header() {
  const supabaseClient = getSupabaseClient();
  const user = await getUser(supabaseClient);

  return (
    <header className="navbar bg-base-100 flex-1 w-full fixed inset-x-0 shadow-sm z-50">
      <div className="navbar-start">
        <Link href="/memos" className="btn btn-ghost">
          <Image src="/images/pngs/icon.png" width={28} height={28} alt="icon" />
          <span className="text-xl">웹 메모</span>
        </Link>
      </div>
      <div className="flex navbar-end">
        {user?.data?.user ? (
          <div className="flex gap-2">
            <button className="btn btn-circle btn-sm">
              <MemoRefresh width={32} hanging={32} fill="white" id="refresh" cursor="pointer" color="gray" />
            </button>
            <div className="btn btn-circle btn-sm">
              <div className="avatar dropdown dropdown-bottom dropdown-end">
                <div className="w-8 rounded-full" tabIndex={0} role="button">
                  <img src={user?.data?.user?.identities?.[0]?.identity_data?.avatar_url} />
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
        ) : (
          <Link className="btn btn-ghost text-md" href="login">
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}

function Margin() {
  return <div className="h-16" />;
}

Header.Margin = Margin;
