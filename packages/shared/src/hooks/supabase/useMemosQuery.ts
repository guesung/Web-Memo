import { getChoseong } from 'es-hangul';
import { QUERY_KEY } from '@src/constants';
import { MemoService } from '@src/utils';
import { useSuspenseQuery } from '@tanstack/react-query';

import useSupabaseClientQuery from './useSupabaseClientQuery';
import { MemoRow } from '@src/types';

type QueryFnData = Awaited<ReturnType<MemoService['getMemos']>>;
type QueryError = Error;
type QueryData = MemoRow[];

interface UseMemosQueryProps {
  category?: string;
  isWish?: boolean;
  searchQuery?: string;
  searchTarget?: string;
}

export default function useMemosQuery({
  category,
  isWish = false,
  searchQuery,
  searchTarget,
}: UseMemosQueryProps = {}) {
  const { data: supabaseClient } = useSupabaseClientQuery();
  const searchQueryLower = searchQuery?.toLowerCase();

  const query = useSuspenseQuery<QueryFnData, QueryError, QueryData>({
    queryFn: new MemoService(supabaseClient).getMemos,
    select: ({ data: memos }) => {
      return (
        memos
          ?.filter(memo => !!isWish === !!memo.isWish)
          .filter(memo => (category ? memo.category?.name === category : true))
          .filter(memo => {
            if (!searchQueryLower) return true;

            const isTitleMatch =
              memo.title?.toLowerCase().includes(searchQueryLower) ||
              getChoseong(memo.title).includes(searchQueryLower);
            const isMemoMatch =
              memo.memo?.toLowerCase().includes(searchQueryLower) || getChoseong(memo.memo).includes(searchQueryLower);
            const isCategoryMatch = memo.category?.name.toLowerCase().includes(searchQueryLower);

            if (isCategoryMatch) return true;
            if (searchTarget === 'title') return isTitleMatch;
            if (searchTarget === 'memo') return isMemoMatch;
            return isTitleMatch || isMemoMatch;
          }) ?? []
      );
    },
    queryKey: QUERY_KEY.memos(),
  });

  return {
    ...query,
    memos: query.data ?? [],
  };
}
