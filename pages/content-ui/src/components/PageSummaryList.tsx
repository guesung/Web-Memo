import { Summary } from '@extension/shared';
import { useEffect, useState } from 'react';

export default function PageSummaryList() {
  const [summaryList, setSummaryList] = useState<Summary>([]);
  useEffect(() => {
    (async () => {
      const response = await chrome.storage.sync.get('summaryList');
      console.log(response);
      // setSummaryList
    })();
  }, []);

  return <div></div>;
}
