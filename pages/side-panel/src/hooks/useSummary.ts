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
  const [errorMessage, setErrorMessage] = useState('');

  const startSummary = async () => {
    setSummary('');
    setErrorMessage('');

    let pageContent = '';
    let currentCategory: Category = 'others';
    try {
      const { content, category } = await requestPageContent();
      pageContent = content;
      currentCategory = category;
      setCategory(category);
    } catch (e) {
      setErrorMessage(I18n.get('error_get_page_content'));
      return;
    }
    try {
      await Runtime.connect(
        BRIDGE_TYPE_GET_SUMMARY,
        { pageContent, category: currentCategory },
        (message: string) => message && setSummary(prev => prev + message),
      );
    } catch (e) {
      setErrorMessage(I18n.get('error_get_summary'));
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
    errorMessage,
  };
}
