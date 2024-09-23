import { signInOAuth } from '@src/utils';
import Image from 'next/image';

export default function LoginSection() {
  const handleGoogleLogin = () => signInOAuth('google');

  return (
    <section className="flex justify-center flex-col gap-8">
      <p className="text-2xl text-center">소셜 로그인</p>
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
