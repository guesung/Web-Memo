import { URL_CHROME_STORE } from '@extension/shared/constants';
import { YoutubeEmbed } from '@src/components';
import Link from 'next/link';

export default function Introduction() {
  return (
    <section className="px-12 pt-40 flex from-cyan-500 to-blue-500 gap-4">
      <article className="flex-[55] flex flex-col items-center">
        <p className="text-3xl">Web Memo: 이제 chatGPT의 요약과 함께</p>
        <p className="text-3xl">웹페이지를 읽을면서 편하게 메모하세요!</p>
        <div className="h-8" />
        <p className="text-lg font-semibold">핵심 기능 3가지</p>
        <div className="h-2" />
        <ul className="list-decimal text-md">
          <li>메모: 웹 페이지에서 중요한 정보나 메모하고 싶은 내용을 쉽게 기록할 수 있습니다.</li>
          <li>사이드 패널: 웹 페이지 열람을 방해받지 않고 사이드 패널에서 편리하게 기록할 수 있습니다.</li>
          <li>페이지 요약: ChatGPT가 웹사이트 내용을 요약해주어 효율적으로 글을 읽을 수 있도록 도와드립니다.</li>
        </ul>
        <div className="h-20" />
        <Link href={URL_CHROME_STORE} target="_blank">
          <button className="btn btn-primary text-xl">chrome에 추가하기</button>
        </Link>
      </article>
      <article className="flex-[45] hidden lg:block">
        <div className="h-20" />
        <YoutubeEmbed embedId="3s6ZNMnmL_4" className="rounded-2xl" isAutoPlay />
      </article>
    </section>
  );
}
