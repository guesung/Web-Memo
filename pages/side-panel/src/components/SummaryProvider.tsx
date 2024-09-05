import { useGetSummary } from '@src/hooks';
import { createContext, PropsWithChildren, useContext } from 'react';

interface SummaryContext extends ReturnType<typeof useGetSummary> {}

const SummaryContext = createContext<SummaryContext>({
  refetchSummary: async () => {},
  summary: '',
  isSummaryLoading: false,
});

export const useSummaryContext = () => {
  const context = useContext<SummaryContext>(SummaryContext);

  if (!context) throw new Error('Provider가 없습니다.');
  return context;
};

export default function SummaryProvider({ children }: PropsWithChildren) {
  const useGetSummaryProps = useGetSummary();

  return <SummaryContext.Provider value={useGetSummaryProps}>{children}</SummaryContext.Provider>;
}
