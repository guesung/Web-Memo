import { YoutubeEmbed } from '@src/components';

export default function Introduction() {
  return (
    <article className="px-12 py-20 flex from-cyan-500 to-blue-500 gap-4">
      <section className="flex-[55] flex flex-col items-center">
        <p className="text-3xl">Web Memo: 이제 chatGPT의 요약과 함께</p>
        <p className="text-3xl">웹페이지를 읽을면서 편하게 메모하세요!</p>
        <div className="h-8" />
        <ul className="list-disc text-md">
          <li>메모: 웹 페이지에서 중요한 정보나 메모하고 싶은 내용을 쉽게 기록할 수 있습니다.</li>
          <li>사이드 패널: 웹 페이지 열람을 방해받지 않고 사이드 패널에서 편리하게 기록할 수 있습니다.</li>
          <li>페이지 요약: ChatGPT가 웹사이트 내용을 요약해주어 효율적으로 글을 읽을 수 있도록 도와드립니다.</li>
          <li>메모 확인: 저장한 메모를 자사 사이트에서 한눈에 확인할 수 있습니다.</li>
        </ul>
        <div className="h-20" />
        <button className="btn btn-primary">chrome에 추가</button>
      </section>
      <section className="flex-[45]">
        <div className="h-20" />
        <YoutubeEmbed embedId="3s6ZNMnmL_4" className="rounded-2xl" isAutoPlay />
      </section>
    </article>
  );
}
