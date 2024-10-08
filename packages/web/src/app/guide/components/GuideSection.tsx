'use client';
import Image from 'next/image';
import Link from 'next/link';

export default function GuideSection() {
  return (
    <section className="flex h-full md:flex-row flex-col">
      <article className="flex-1 flex flex-col justify-center items-center text-center">
        <p className="text-4xl">로그인 완료 ✅</p>
        <p>이제, 모든 사이트에서 웹 메모를 이용해보실 수 있습니다 🎉</p>
        <div className="h-8" />
        <p>
          Window 기준 <span className="underline">Alt + S</span>, Mac 기준 <span className="underline">Option + S</span>
        </p>
        <p>를 눌러 사이드 패널을 열어보세요.</p>
        <div className="h-8" />
        <p>메모를 보러 가시겠습니까?</p>
        <div className="h-4" />
        <button className="btn">
          <Link href="/memos">메모 보러가기</Link>
        </button>
      </article>
      <div className="divider divider-horizontal">.</div>
      <article className="flex-1 flex justify-center items-center">
        <Image src="/images/pngs/guide.png" width={280} height={100} alt="guide" />
      </article>
    </section>
  );
}
