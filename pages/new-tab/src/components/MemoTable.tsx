import { formatDate, MemoStorage, SyncStorage, urlToKey, useFetch } from '@extension/shared';
import { Toast } from '@extension/ui';
import { overlay } from 'overlay-kit';

export default function MemoTable() {
  const { data: memoStorage } = useFetch({
    fetchFn: SyncStorage.get<MemoStorage>,
  });

  const handleDeleteClick = async (url: string) => {
    const answer = confirm('삭제하시겠습니까?');
    if (!answer) return;

    await chrome.storage.sync.remove(urlToKey(url));
  };

  const handleMemoClick = async (memo: string) => {
    await navigator.clipboard.writeText(memo);
    overlay.open(({ unmount }) => <Toast message="메모를 복사하였습니다." onClose={unmount} />);
  };

  return (
    <table className="table max-w-[1000px] shadow-xl mx-auto">
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
          <tr key={memo.url} className="hover">
            <th className="text-center">{index + 1}</th>
            <td>
              <a href={memo.url} target="_blank" rel="noreferrer" className="tooltip text-start" data-tip={memo.url}>
                {memo.title}
              </a>
            </td>
            <td className="whitespace-nowrap">{formatDate(new Date(memo.date))}</td>
            <td>
              <div className="tooltip" data-tip="메모 복사">
                <button
                  type="button"
                  onClick={() => handleMemoClick(memo.memo)}
                  className="cursor-pointer text-start whitespace-break-spaces">
                  {memo.memo}
                </button>
              </div>
            </td>
            <td className="tooltip" data-tip="메모 제거">
              <button type="button" onClick={() => handleDeleteClick(memo.url)} className="text-center w-full">
                x
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
