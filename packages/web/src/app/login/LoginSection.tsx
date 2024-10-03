import { signInWithOAuthGoogle, signInWithOAuthKakao } from '@src/utils/supabase.server';
import Image from 'next/image';

export default async function LoginSection() {
  return (
    <section className="flex justify-center flex-col gap-8 items-center">
      <p className="text-2xl text-center">환영합니다</p>
      <p>가입하여 chatGPT 이용 및 메모하기</p>
      <form>
        <button formAction={signInWithOAuthKakao}>
          <Image
            src="/images/svgs/google-login.svg"
            width={200}
            height={200}
            alt="google로그인"
            className="cursor-pointer"
          />
        </button>
        <button formAction={signInWithOAuthGoogle}>
          <Image
            src="/images/svgs/google-login.svg"
            width={200}
            height={200}
            alt="google로그인"
            className="cursor-pointer"
          />
        </button>
      </form>
    </section>
  );
}
