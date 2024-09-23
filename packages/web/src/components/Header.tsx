import Image from 'next/image';
import Link from 'next/link';

interface HeaderProps {}
export default function Header() {
  return (
    <header className="navbar bg-base-100 flex-1 w-full">
      <div className="navbar-start">
        <Link href="/" className="btn btn-ghost text-xl">
          <Image src="/images/pngs/icon.png" width={24} height={24} alt="icon" />
          <span>웹 메모</span>
        </Link>
      </div>
      <div className="flex navbar-end">
        <Link className="btn btn-ghost text-xl" href="memo">
          나의 메모
        </Link>
        {/* <Link className="btn btn-ghost text-xl" href="login">
          로그인
        </Link> */}
      </div>
    </header>
  );
}
