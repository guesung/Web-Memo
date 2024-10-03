import { useDidMount } from '@extension/shared/hooks';
import { getSupabaseClient } from '@extension/shared/utils/web';
import { createClient } from '@src/utils/supabase-server';
import Image from 'next/image';
import Link from 'next/link';

export default async function Header() {
  const supabaseClient = createClient();
  const userIdentities = await supabaseClient.auth.getUserIdentities();
  console.log(userIdentities?.data?.identities[0]?.identity_data?.avatar_url);

  return (
    <header className="navbar bg-base-100 flex-1 w-full fixed inset-x-0 shadow-sm">
      <div className="navbar-start">
        <Link href="/" className="btn btn-ghost text-md">
          <Image src="/images/pngs/icon.png" width={24} height={24} alt="icon" />
          <span>웹 메모</span>
        </Link>
      </div>
      <div className="flex navbar-end">
        <Link className="btn btn-ghost text-md" href="memo">
          나의 메모
        </Link>
        <Link className="btn btn-ghost text-md" href="login">
          로그인
        </Link>
      </div>
    </header>
  );
}
