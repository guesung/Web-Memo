import { signInWithOAuth } from '@src/utils/supabase.server';
import Image from 'next/image';

export default async function LoginSection() {
  return (
    <section className="flex justify-center flex-col gap-8 items-center">
      <p className="text-2xl text-center">환영합니다</p>
      <p>가입하여 chatGPT 이용 및 메모하기</p>
      <form className="flex flex-col gap-4">
        <button
          formAction={signInWithOAuth.bind(null, 'kakao')}
          className="btn bg-[rgb(247,228,76)] text-black hover:bg-[rgb(247,228,76)]">
          <Image src="/images/svgs/kakao.svg" width={16} height={16} alt="google" />
          카카오 로그인
        </button>
        <button formAction={signInWithOAuth.bind(null, 'google')} className="btn bg-white hover:bg-white text-black">
          <Image src="/images/svgs/google.svg" width={16} height={16} alt="google" />
          구글 로그인
        </button>
      </form>
    </section>
  );
}
