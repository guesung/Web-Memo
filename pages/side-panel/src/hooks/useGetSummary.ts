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
      console.log('페이지 컨텐츠를 가져오는데 실패했습니다');
      throw new Error('페이지 컨텐츠를 가져오는데 실패했습니다.');
    }
    try {
      await Runtime.connect(
        BRIDGE_TYPE_SUMMARY,
        { pageContent },
        (message: string) => message && setSummary(prev => prev + message),
      );
    } catch (e) {
      console.log('요약을 가져오는데 실패했습니다.');
      throw new Error('요약을 가져오는데 실패했습니다.');
    }
  };

  const { isLoading, refretch } = useFetch({ fetchFn: startSummary });

  return {
    isSummaryLoading: isLoading,
    summary,
    startSummary: refretch,
  };
}
