import { signInWithOAuth } from '@src/utils/supabase.server';
import Image from 'next/image';
import ExtensionVersion from './ExtensionVersion';

export default async function LoginSection() {
  return (
    <section className="card base-300 flex w-96 flex-col items-center justify-center bg-white py-12 opacity-80 shadow-xl">
      <p className="text-center text-2xl">환영합니다</p>
      <p className="text-md text-center">편리하게 메모를 작성할 수 있는 웹 메모입니다.</p>
      <div className="h-8" />
      <form className="flex w-full flex-col gap-4 px-4">
        <button
          formAction={signInWithOAuth.bind(null, 'kakao')}
          className="btn bg-[rgb(247,228,76)] text-black hover:bg-[rgb(247,228,76)]">
          <Image src="/images/svgs/kakao.svg" width={16} height={16} alt="google" />
          카카오 로그인
        </button>
        <button formAction={signInWithOAuth.bind(null, 'google')} className="btn bg-white text-black hover:bg-white">
          <Image src="/images/svgs/google.svg" width={16} height={16} alt="google" />
          구글 로그인
        </button>
      </form>
      <ExtensionVersion />
    </section>
  );
}
