import { formatDate, MemoStorage, SyncStorage, urlToKey, useFetch } from '@extension/shared';

export default function MemoTable() {
  const { data: memoStorage } = useFetch({
    fetchFn: SyncStorage.get<MemoStorage>,
  });

  const handleDelete = async (url: string) => {
    const answer = confirm('삭제하시겠습니까?');
    if (!answer) return;

    await chrome.storage.sync.remove(urlToKey(url));
  };

  return (
    <table className="table">
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
        {Object.values(memoStorage).map((memo, index) => (
          <tr key={memo.url}>
            <th className="text-center">{index + 1}</th>
            <td>
              <a href={memo.url} target="_blank" rel="noreferrer" className="tooltip text-start" data-tip={memo.url}>
                {memo.title}
              </a>
            </td>
            <td className="whitespace-nowrap">{formatDate(new Date(memo.date))}</td>
            <td className="whitespace-break-spaces">{memo.memo}</td>
            <td className="text-center" onClick={() => handleDelete(memo.url)}>
              x
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
