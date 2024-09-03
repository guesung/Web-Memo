import { BRIDGE_TYPE_SUMMARY, requestPageContent } from '@extension/shared';
import { useState } from 'react';

export default function useGetSummary() {
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summary, setSummary] = useState('');

  const startSummary = async () => {
    setIsSummaryLoading(true);
    setSummary('');
    let pageContent = '';
    try {
      pageContent = await requestPageContent();
    } catch (e) {
      setIsSummaryLoading(false);
      setSummary('Failed to get page content');
      return;
    }

    const port = chrome.runtime.connect({ name: BRIDGE_TYPE_SUMMARY });
    port.postMessage({ pageContent });
    port.onMessage.addListener(async message => {
      if (message === null) {
        setIsSummaryLoading(false);
        return;
      }
      setSummary(prev => prev + message);
    });
  };

  return {
    isSummaryLoading,
    summary,
    startSummary,
  };
}
