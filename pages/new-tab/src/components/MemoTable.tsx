import { formatDate } from '@extension/shared';
import { useGetMemo } from '@src/hooks';

export default function MemoTable() {
  const { memoList } = useGetMemo();

  return (
    <table className="table">
      <thead>
        <tr>
          <th className="text-center">번호</th>
          <th className="w-1/3 text-center">제목</th>
          <th className="text-center">날짜</th>
          <th className="w-full text-center">메모</th>
        </tr>
      </thead>
      <tbody>
        {memoList.map((memo, index) => (
          <tr key={memo.url}>
            <th className="text-center">{index + 1}</th>
            <td>
              <a href={memo.url} target="_blank" rel="noreferrer" className="tooltip text-start" data-tip={memo.url}>
                {memo.title}
              </a>
            </td>
            <td className="whitespace-nowrap">{formatDate(new Date(memo.date))}</td>
            <td className="whitespace-break-spaces">{memo.memo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
