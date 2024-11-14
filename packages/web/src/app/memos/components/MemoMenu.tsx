import Link from 'next/link';

export default function MemoMenu() {
  return (
    <ul className="menu xl:menu-horizontal bg-base-200 rounded-box lg:min-w-max">
      <li>
        <Link href="/memos?show=all">전체 보기</Link>
      </li>
      <li>
        <Link href="/memos?show=wish">위시리스트</Link>
      </li>
    </ul>
  );
}
