import { signInOAuth } from '@src/utils';
import Image from 'next/image';

export default function LoginSection() {
  const handleGoogleLogin = () => signInOAuth('google');

  return (
    <section className="flex justify-center">
      <Image
        src="/images/svgs/google-login.svg"
        width={100}
        height={100}
        alt="google로그인"
        onClick={handleGoogleLogin}
        className="cursor-pointer"
      />
    </section>
  );
}
