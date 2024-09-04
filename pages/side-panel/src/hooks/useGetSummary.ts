import { BRIDGE_TYPE_SUMMARY, requestPageContent, Runtime, useFetch } from '@extension/shared';
import { useState } from 'react';

export default function useGetSummary() {
  const [summary, setSummary] = useState('');

  const startSummary = async () => {
    setSummary('');
    let pageContent = '';
    try {
      pageContent = await requestPageContent();
    } catch (e) {
      setSummary('Error Occur');
      return;
    }

    await Runtime.connect(BRIDGE_TYPE_SUMMARY, { pageContent }, (message: string) =>
      setSummary(prev => prev + message),
    );
  };

  const { isLoading } = useFetch({ fetchFn: startSummary });

  return {
    isSummaryLoading: isLoading,
    summary,
    startSummary,
  };
}
