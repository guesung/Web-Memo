import { formatDate, keyToUrl, MemoStorage, MemoType, SyncStorage } from '@extension/shared';
import React, { useEffect, useState } from 'react';

interface MemoTableProps {}
export default function MemoTable() {
  const [memoList, setMemoList] = useState<MemoType[]>([]);

  useEffect(() => {
    (async () => {
      const storage = await SyncStorage.get<MemoStorage>();
      for (const url in storage) {
        setMemoList((prev: MemoType[]) => [
          ...prev,
          {
            ...storage[url],
            url: keyToUrl(url),
          },
        ]);
      }
    })();
  }, []);
  console.log(memoList);

  return (
    <table className="table">
      <thead>
        <tr>
          <th></th>
          <th>제목</th>
          <th>날짜</th>
          <th>Memo</th>
        </tr>
      </thead>
      <tbody>
        {memoList.map((memo, index) => (
          <tr key={memo.url}>
            <th>{index + 1}</th>
            <td className="w-1/3">
              <a href={memo.url} target="_blank" rel="noreferrer" className="tooltip" data-tip={memo.url}>
                {memo.title}
              </a>
            </td>
            <td className="whitespace-nowrap">{formatDate(new Date(memo.date))}</td>
            <td>{memo.memo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
