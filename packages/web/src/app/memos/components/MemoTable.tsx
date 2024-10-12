'use client';

import { useMemoListQuery } from '@extension/shared/hooks';
import { MemoSupabaseResponse } from '@extension/shared/types';
import { formatDate } from '@extension/shared/utils';
import { useMemoDeleteMutation } from '@src/hooks';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { UseQueryResult } from '@tanstack/react-query';

export default function MemoTable() {
  const { mutate: deleteMemoMutate } = useMemoDeleteMutation();
  const supabaseClient = getSupabaseClient();
  // TODO :타입 에러로 인해 타입 단언으로 임시 해결
  const { data: memoListData }: UseQueryResult<MemoSupabaseResponse, Error> = useMemoListQuery({
    supabaseClient,
  });
  const handleDeleteClick = async (id: number) => {
    const answer = confirm('삭제하시겠습니까?');
    if (!answer) return;
    deleteMemoMutate(id);
  };

  const memoList = memoListData?.data;
  if (!memoList || memoList.length === 0)
    return <p className="text-center mt-8">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>;
  return (
    <table id="memo-table" className="table max-w-[1200px] mx-auto">
      <thead>
        <tr>
          <th className="text-center">번호</th>
          <th className="w-1/3 text-center">제목</th>
          <th className="w-full text-center">메모</th>
          <th className="text-center">날짜</th>
          <th className="w-full text-center hidden lg:block">삭제</th>
        </tr>
      </thead>
      <tbody>
        {memoList.map((memo, index) => (
          <tr key={memo.id} className="hover">
            <td className="text-center">{index + 1}</td>
            <td>
              <a
                href={memo.url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-2 text-start max-w-[18rem] link-hover"
                data-tip={memo.url}>
                {memo.title}
              </a>
            </td>
            <td>
              <p className="text-start whitespace-break-spaces">{memo.memo}</p>
            </td>
            <td className="whitespace-nowrap">{formatDate(memo.created_at)}</td>
            <td>
              <button type="button" onClick={() => handleDeleteClick(memo.id)} className="text-center w-full">
                x
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
