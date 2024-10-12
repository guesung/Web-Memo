'use client';

import { useMemoListQuery } from '@extension/shared/hooks';
import type { MemoRow, MemoSupabaseResponse } from '@extension/shared/types';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { UseQueryResult } from '@tanstack/react-query';

export default function MemoGrid() {
  const supabaseClient = getSupabaseClient();
  // TODO :타입 에러로 인해 타입 단언으로 임시 해결
  const { data: memoListData }: UseQueryResult<MemoSupabaseResponse, Error> = useMemoListQuery({
    supabaseClient,
  });

  const memoList = memoListData?.data;
  if (!memoList || memoList.length === 0)
    return <p className="text-center mt-8">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>;
  return (
    <section className="break-inside-avoid columns-1 sm:columns-2 lg:columns-3 gap-4 px-4">
      {memoList.map(memo => (
        <MemoItem key={memo.id} memo={memo} />
      ))}
    </section>
  );
}

interface MemoItemProps {
  memo: MemoRow;
}

function MemoItem({ memo }: MemoItemProps) {
  return (
    <div className="bg-base-100 shadow-xl mb-4 card box-border">
      <div className="card-body">
        <p className="font-bold">{memo.title}</p>
        <p className="whitespace-break-spaces">{memo.memo}</p>
      </div>
    </div>
  );
}
