import Link from 'next/link';

interface HeaderProps {}
export default function Header() {
  return (
    <header className="navbar bg-base-100">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">Icon</a>
        <Link className="btn btn-ghost text-xl" href="login">
          로그인
        </Link>
      </div>
    </header>
  );
}
