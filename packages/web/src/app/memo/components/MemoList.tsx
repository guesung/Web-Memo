'use client';

import { formatDate, getMemoSupabase } from '@extension/shared/utils';
import { getSupabaseClient } from '@extension/shared/utils/web';
import { useFetch } from '@extension/shared/hooks';
import type { MemoSupabaseResponse } from '@extension/shared/types';

import { useEffect } from 'react';

export default function MemoList() {
  const getMemoList = async () => {
    const supabaseClient = getSupabaseClient();
    return await getMemoSupabase(supabaseClient);
  };

  const { data: memoResponse, refetch: refetchMemo } = useFetch<MemoSupabaseResponse>({ fetchFn: getMemoList });

  // const handleDeleteClick = async () => {
  //   const answer = confirm('삭제하시겠습니까?');
  //   if (!answer) return;
  //   await deleteMemo
  //   await refetchMemo();
  // };

  const memoList = memoResponse?.data;
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
          <tr key={memo.url} className="hover">
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
            {/* <td>
              <button type="button" onClick={() => handleDeleteClick()} className="text-center w-full">
                x
              </button>
            </td> */}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
