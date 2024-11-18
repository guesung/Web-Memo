'use client';

import { useMemoListQuery } from '@extension/shared/hooks';
import { formatDate } from '@extension/shared/utils';
import { useMemoDeleteMutation } from '@src/hooks';
import { getSupabaseClient } from '@src/utils/supabase.client';

export default function MemoTable() {
  const { mutate: deleteMemoMutate } = useMemoDeleteMutation({});
  const supabaseClient = getSupabaseClient();
  const { data: memoListData } = useMemoListQuery({
    supabaseClient,
  });
  const handleDeleteClick = async (id: number) => {
    const answer = confirm('삭제하시겠습니까?');
    if (!answer) return;
    deleteMemoMutate(id);
  };

  const memoList = memoListData?.data;
  if (!memoList || memoList.length === 0)
    return <p className="mt-8 text-center">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>;
  return (
    <table id="memo-table" className="mx-auto table max-w-[1200px]">
      <thead>
        <tr>
          <th className="text-center">번호</th>
          <th className="w-1/3 text-center">제목</th>
          <th className="w-full text-center">메모</th>
          <th className="text-center">날짜</th>
          <th className="hidden w-full text-center lg:block">삭제</th>
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
                className="link-hover line-clamp-2 max-w-[18rem] text-start"
                data-tip={memo.url}>
                {memo.title}
              </a>
            </td>
            <td>
              <p className="whitespace-break-spaces text-start">{memo.memo}</p>
            </td>
            <td>
              <button type="button" onClick={() => handleDeleteClick(memo.id)} className="w-full text-center">
                x
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
