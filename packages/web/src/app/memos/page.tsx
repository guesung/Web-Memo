import { queryKeys } from '@extension/shared/constants';
import { getMemo } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoGrid, MemoTable, MemoMenu, MemoWish } from './components';

export type CategoryType = 'wish';

type SearchParamsType = { category: CategoryType };

interface MemoViewProps {
  searchParams: SearchParamsType;
}

export default async function Page({ searchParams }: MemoViewProps) {
  const supabaseClient = getSupabaseClient();

  const category: CategoryType = searchParams?.category ?? '';
  return (
    <>
      <Header />
      <Header.Margin />
      <main className="flex w-full p-4">
        <MemoMenu />
        <MemoMenu.Margin />
        <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemo(supabaseClient)}>
          <MemoGrid category={category} />
        </HydrationBoundaryWrapper>
      </main>
    </>
  );
}
