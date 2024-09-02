import { withErrorBoundary, withSuspense, keyToUrl, SummaryStorage, SummaryType, SyncStorage } from '@extension/shared';
import { useEffect, useState } from 'react';

const NewTab = () => {
  const [summaryList, setSummaryList] = useState<SummaryType[]>([]);
  useEffect(() => {
    (async () => {
      const storage = await SyncStorage.get<SummaryStorage>();
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
    <div className="shadow-xl">
      {summaryList.map(it => (
        <div key={it.date} className="card card-body">
          <h2 className="card-title">{it.title}</h2>
          <p className="text-start">{it.url}</p>
          <p className="text-start">{it.date}</p>
          <p>{it.summary}</p>
        </div>
      ))}
    </div>
  );
};

export default withErrorBoundary(withSuspense(NewTab, <div> Loading ... </div>), <div> Error Occur </div>);
