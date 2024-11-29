import { useSummary } from '@src/hooks';
import { createContext, PropsWithChildren, useContext } from 'react';

interface SummaryContext extends ReturnType<typeof useSummary> {}

const SummaryContext = createContext<SummaryContext>({
  refetchSummary: async () => {},
  summary: '',
  category: 'others',
  isSummaryLoading: false,
});

export const useSummaryContext = () => {
  const context = useContext<SummaryContext>(SummaryContext);

  if (!context) throw new Error('SummaryProvider가 없습니다.');
  return context;
};

export default function SummaryProvider({ children }: PropsWithChildren) {
  const useSummaryProps = useSummary();

  return <SummaryContext.Provider value={useSummaryProps}>{children}</SummaryContext.Provider>;
}
