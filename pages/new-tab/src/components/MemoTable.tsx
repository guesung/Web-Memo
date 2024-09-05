import { formatDate, I18n, MemoStorage, MemoType, urlToKey, useFetch } from '@extension/shared';
import { Toast } from '@extension/ui';
import { overlay } from 'overlay-kit';

export default function MemoTable() {
  const { data: memoStorage } = useFetch({
    fetchFn: MemoStorage.get,
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
          <th className="text-center">{I18n.get('number')}</th>
          <th className="w-1/3 text-center">{I18n.get('title')}</th>
          <th className="text-center">{I18n.get('date')}</th>
          <th className="w-full text-center">{I18n.get('memo')}</th>
          <th className="w-full text-center">{I18n.get('delete')}</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(memoStorage as MemoType[])
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((memo, index) => (
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
