import { useFetch } from '@extension/shared/hooks';
import {
  BRIDGE_TYPE_GET_SUMMARY,
  Category,
  I18n,
  requestPageContent,
  Runtime,
} from '@extension/shared/utils/extension';
import { useState } from 'react';

export default function useSummary() {
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState<Category>('others');

  const startSummary = async () => {
    setSummary('');
    let pageContent = '';
    try {
      const { content, category } = await requestPageContent();
      pageContent = content;
      setCategory(category);
    } catch (e) {
      setSummary(I18n.get('error_get_page_content'));
      return;
    }
    try {
      await Runtime.connect(
        BRIDGE_TYPE_GET_SUMMARY,
        { pageContent },
        (message: string) => message && setSummary(prev => prev + message),
      );
    } catch (e) {
      setSummary(I18n.get('error_get_summary'));
    }
  };

  const { isLoading, refetch: refetchSummary } = useFetch({
    fetchFn: startSummary,
  });

  return {
    isSummaryLoading: isLoading,
    summary,
    refetchSummary,
    category,
  };
}
