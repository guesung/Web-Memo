import { BRIDGE_TYPE_SUMMARY, I18n, requestPageContent, Runtime, useFetch } from '@extension/shared';
import { useState } from 'react';

export default function useSummary() {
  const [summary, setSummary] = useState('');

  const startSummary = async () => {
    setSummary('');
    let pageContent = '';
    try {
      pageContent = await requestPageContent();
    } catch (e) {
      setSummary(I18n.get('error_get_page_content'));
      return;
    }
    try {
      await Runtime.connect(
        BRIDGE_TYPE_SUMMARY,
        { pageContent },
        (message: string) => message && setSummary(prev => prev + message),
      );
    } catch (e) {
      setSummary(I18n.get('error_get_summary'));
    }
  };

  const { status, refetch: refetchSummary } = useFetch({
    fetchFn: startSummary,
  });

  return {
    isSummaryLoading: status,
    summary,
    refetchSummary,
  };
}
