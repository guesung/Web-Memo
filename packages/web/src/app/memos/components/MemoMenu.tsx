import Link from 'next/link';

export default function MemoMenu() {
  return (
    <ul className="menu bg-base-200 rounded-box fixed lg:min-w-max">
      <li>
        <Link href="/memos">메모</Link>
      </li>
      <li>
        <Link href="/memos?category=wish">위시리스트</Link>
      </li>
    </ul>
  );
}

function Margin() {
  return <div className="h-4 w-[120px]"></div>;
}
MemoMenu.Margin = Margin;
