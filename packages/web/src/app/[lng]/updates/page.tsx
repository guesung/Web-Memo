import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '업데이트 소식 | Page Summary',
  description: 'Page Summary의 최신 업데이트 소식을 확인하세요.',
};

interface Update {
  date: string;
  version: string;
  title: string;
  content: string[];
}

const updates: Update[] = [
  {
    date: '2024-12-17',
    version: '1.0.0',
    title: '주요 기능 업데이트',
    content: ['새로운 기능 1이 추가되었습니다', '성능이 개선되었습니다', '버그가 수정되었습니다'],
  },
  // 추가 업데이트 내역...
];

export default function UpdatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold dark:text-white">업데이트 소식</h1>
      <div className="space-y-8">
        {updates.map((update, index) => (
          <div key={index} className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-3">
              <time className="text-sm text-gray-500 dark:text-gray-400">{update.date}</time>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                v{update.version}
              </span>
            </div>
            <h2 className="mb-4 text-xl font-semibold dark:text-white">{update.title}</h2>
            <ul className="list-inside list-disc space-y-2">
              {update.content.map((item, i) => (
                <li key={i} className="text-gray-700 dark:text-gray-300">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
