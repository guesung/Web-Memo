import { queryKeys } from '@extension/shared/constants';
import { getMemo } from '@extension/shared/utils';
import { Header, HydrationBoundaryWrapper } from '@src/components';
import { getSupabaseClient } from '@src/utils/supabase.server';
import { MemoGrid, MemoTable, MemoMenu, MemoWish } from './components';

type SearchParamsType = { view: ViewType; show: ShowType };

export type ViewType = 'grid' | 'table';
export type ShowType = 'all' | 'wish';
interface MemoViewProps {
  searchParams: SearchParamsType;
}

export default async function Page({ searchParams }: MemoViewProps) {
  const supabaseClient = getSupabaseClient();

  const view: ViewType = searchParams?.view ?? 'grid';
  const show: ShowType = searchParams?.show ?? 'all';
  return (
    <>
      <Header />
      <Header.Margin />
      <main className="flex w-full p-4">
        <MemoMenu />
        <HydrationBoundaryWrapper queryKey={queryKeys.memoList()} queryFn={() => getMemo(supabaseClient)}>
          {view === 'grid' && <MemoGrid show={show} />}
          {view === 'table' && <MemoTable />}
        </HydrationBoundaryWrapper>
      </main>
    </>
  );
}
