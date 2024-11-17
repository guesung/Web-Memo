import { Button } from '@src/components/ui/button';
import { signInWithOAuth } from '@src/utils/supabase.server';
import Image from 'next/image';
import ExtensionVersion from './ExtensionVersion';

export default async function LoginSection() {
  return (
    <section className="relative flex w-96 flex-col items-center justify-center rounded-md bg-zinc-100 py-12 opacity-80 shadow-xl dark:bg-zinc-900">
      <p className="text-center text-2xl">환영합니다</p>
      <p className="text-md text-center">편리하게 메모를 작성할 수 있는 웹 메모입니다.</p>
      <div className="h-8" />
      <form className="flex w-full flex-col gap-4 px-4">
        <Button
          formAction={signInWithOAuth.bind(null, 'kakao')}
          className="h-12 bg-[rgb(247,228,76)] text-black hover:bg-[rgb(247,228,76)]">
          <Image src="/images/svgs/kakao.svg" width={16} height={16} alt="kakao" />
          카카오 로그인
        </Button>
        <Button formAction={signInWithOAuth.bind(null, 'google')} className="h-12 bg-white text-black hover:bg-white">
          <Image src="/images/svgs/google.svg" width={16} height={16} alt="google" />
          구글 로그인
        </Button>
        {/* <button formAction={signInWithEmail.bind(null, SUPABASE_TEST_EMAIL, SUPABASE_TEST_PASSWORD)} className="btn">
          테스트 계정으로 로그인
        </button> */}
      </form>
      <ExtensionVersion />
    </section>
  );
}
