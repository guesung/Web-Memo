import Link from 'next/link';

interface HeaderProps {}
export default function Header() {
  return (
    <header className="navbar bg-base-100">
      <div className="flex-1">
        <Link href="/" className="link-hover btn btn-ghost text-xl">
          Icon
        </Link>
        <Link className="link-hover btn btn-ghost text-xl" href="login">
          로그인
        </Link>
        <Link className="link-hover btn btn-ghost text-xl" href="memo">
          나의 메모
        </Link>
      </div>
    </header>
  );
}
