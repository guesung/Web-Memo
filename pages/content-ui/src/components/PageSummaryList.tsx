import { Summary } from '@extension/shared';
import { useEffect, useState } from 'react';

export default function PageSummaryList() {
  const [summaryList, setSummaryList] = useState<Summary[]>([]);
  useEffect(() => {
    (async () => {
      const { summaryList } = await chrome.storage.sync.get('summaryList');
      setSummaryList(summaryList);
    })();
  }, []);

  return (
    <div>
      {summaryList.map(it => (
        <div key={it.date}>
          <h2>{it.title}</h2>
          <p>{it.summary}</p>
        </div>
      ))}
    </div>
  );
}
