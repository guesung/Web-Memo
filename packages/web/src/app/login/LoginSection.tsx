'use client';

import Image from 'next/image';
import { signInOAuth } from '@extension/shared/utils';
import { getSupabaseClient } from '@extension/shared/utils/web';
import { SUPABASE_URL, WEB_URL } from '@src/constants';
import { createClient } from '@supabase/supabase-js';

export default function LoginSection() {
  const handleGoogleLogin = () => signInOAuth(getSupabaseClient(), 'google');

  return (
    <section className="flex justify-center flex-col gap-8 items-center">
      <p className="text-2xl text-center">환영합니다</p>
      <p>가입하여 chatGPT 이용 및 메모하기</p>
      <Image
        src="/images/svgs/google-login.svg"
        width={200}
        height={200}
        alt="google로그인"
        onClick={handleGoogleLogin}
        className="cursor-pointer"
      />
    </section>
  );
}
