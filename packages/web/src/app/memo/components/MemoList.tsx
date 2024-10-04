'use client';

import { queryKeys } from '@extension/shared/constants';
import { formatDate, getMemoSupabase } from '@extension/shared/utils';
import { useMemoDeleteMutation } from '@src/hooks';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { useQuery } from '@tanstack/react-query';

export default function MemoList() {
  const { mutate: deleteMemoMutate } = useMemoDeleteMutation();
  const supabaseClient = getSupabaseClient();
  const { data: memoListData } = useQuery({
    queryKey: queryKeys.memoList(),
    queryFn: () => getMemoSupabase(supabaseClient),
  });
  const handleDeleteClick = async (id: number) => {
    const answer = confirm('삭제하시겠습니까?');
    if (!answer) return;
    deleteMemoMutate(id);
  };

  console.log(memoListData);
  const memoList = memoListData?.data;
  if (!memoList || memoList.length === 0) return <p className="text-center">메모</p>;
  return (
    <table id="memo-table" className="table max-w-[1000px] shadow-xl mx-auto">
      <thead>
        <tr>
          <th className="text-center">번호</th>
          <th className="w-1/3 text-center">제목</th>
          <th className="text-center">날짜</th>
          <th className="w-full text-center">메모</th>
          <th className="w-full text-center">삭제</th>
        </tr>
      </thead>
      <tbody>
        {memoList.map((memo, index) => (
          <tr key={memo.id} className="hover">
            <th className="text-center">{index + 1}</th>
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
            <td className="whitespace-nowrap">{formatDate(memo.created_at)}</td>
            <td>
              <p className="text-start whitespace-break-spaces">{memo.memo}</p>
            </td>
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
