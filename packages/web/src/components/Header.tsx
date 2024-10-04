'use server';
import { getUser } from '@extension/shared/utils';
import { getSupabaseClient, signout } from '@src/utils/supabase.server';
import Image from 'next/image';
import Link from 'next/link';

export default async function Header() {
  const supabaseClient = await getSupabaseClient();
  const user = await getUser(supabaseClient);

  return (
    <header className="navbar bg-base-100 flex-1 w-full fixed inset-x-0 shadow-sm z-50">
      <div className="navbar-start">
        <Link href="/" className="btn btn-ghost text-md">
          <Image src="/images/pngs/icon.png" width={24} height={24} alt="icon" />
          <span>웹 메모</span>
        </Link>
      </div>
      <div className="flex navbar-end">
        {user?.data?.user ? (
          <>
            <Link className="btn btn-ghost text-md" href="memo">
              나의 메모
            </Link>
            <div className="avatar dropdown dropdown-bottom dropdown-end">
              <div className="w-8 rounded-full" tabIndex={0} role="button">
                <img src={user?.data?.user?.identities?.[0]?.identity_data?.avatar_url} />
              </div>
              <form>
                <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                  <li>
                    <button formAction={signout}>로그아웃</button>
                  </li>
                </ul>
              </form>
            </div>
          </>
        ) : (
          <Link className="btn btn-ghost text-md" href="login">
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
