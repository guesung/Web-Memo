import { BRIDGE_TYPE_SUMMARY, getPageContent } from '@extension/shared';
import { useState } from 'react';

export default function useSummary() {
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summary, setSummary] = useState('');

  const startSummary = async () => {
    setIsSummaryLoading(true);
    setSummary('');
    let pageContent = '';
    try {
      pageContent = await getPageContent();
      console.log(pageContent);
    } catch (e) {
      setIsSummaryLoading(false);
      setSummary('Failed to get page content');
      return;
    }

    const port = chrome.runtime.connect({ name: BRIDGE_TYPE_SUMMARY });
    port.postMessage({ pageContent });
    port.onMessage.addListener(async message => {
      setSummary(prev => prev + message);
      if (message === null) {
        setIsSummaryLoading(false);
      }
    });
  };

  return {
    isSummaryLoading,
    summary,
    startSummary,
  };
}
