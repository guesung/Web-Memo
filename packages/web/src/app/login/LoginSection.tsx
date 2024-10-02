'use client';
import { getSupabaseClient } from '@extension/shared/utils/web';
import { createBrowserClient } from '@supabase/ssr';
import Image from 'next/image';

export default async function LoginSection() {
  const handleGoogleLogin = () => {
    const supabaseClient = getSupabaseClient();
    supabaseClient.auth.signInWithOAuth({
      provider: 'google',
    });
  };
  const handleKakaoLogin = () => {
    const supabaseClient = getSupabaseClient();
    supabaseClient.auth.signInWithOAuth({
      provider: 'kakao',
    });
  };

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
      <Image
        src="/images/svgs/google-login.svg"
        width={200}
        height={200}
        alt="google로그인"
        onClick={handleKakaoLogin}
        className="cursor-pointer"
      />
    </section>
  );
}
