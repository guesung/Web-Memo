import { keyToUrl, Storage, SummaryType } from '@extension/shared';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function PageSummaryList() {
  const [summaryList, setSummaryList] = useState<SummaryType[]>([]);
  useEffect(() => {
    (async () => {
      const storage = await Storage.get();
      for (const url in storage) {
        setSummaryList((prev: SummaryType[]) => [
          ...prev,
          {
            ...storage[url],
            url: keyToUrl(url),
          },
        ]);
      }
    })();
  }, []);

  return (
    <div className="prose prose-sm shadow-xl">
      {summaryList.map(it => (
        <div key={it.date} className="card card-body">
          <h2 className="card-title">{it.title}</h2>
          <p className="text-start">{it.url}</p>
          <p className="text-start">{it.date}</p>
          <Markdown remarkPlugins={[remarkGfm]} className="markdown px-4">
            {it.summary}
          </Markdown>
        </div>
      ))}
    </div>
  );
}
