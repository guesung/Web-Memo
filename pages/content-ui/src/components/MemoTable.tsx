import { getMemoList, I18n, MemoStorage } from '@extension/shared/utils/extension';
import { useFetch } from '@extension/shared/hooks';
import { formatUrl } from '@extension/shared/utils';

export default function MemoTable() {
  const { data: memoList, refetch: refetchMemo } = useFetch({
    fetchFn: getMemoList,
    defaultValue: [],
  });

  const handleDeleteClick = async (url: string) => {
    const answer = confirm('삭제하시겠습니까?');
    if (!answer) return;

    await MemoStorage.remove(formatUrl(url));
    await refetchMemo();
  };

  // const handleMemoClick = async (memo: string) => {
  //   await navigator.clipboard.writeText(memo);
  //   overlay.open(({ unmount }) => <Toast message="메모를 복사하였습니다." onClose={unmount} />);
  // };

  if (!memoList || memoList.length === 0) return <p className="text-center">{I18n.get('no_memo')}</p>;
  return (
    <table id="memo-table" className="table max-w-[1000px] shadow-xl mx-auto">
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
            <td className="whitespace-nowrap">{memo.date}</td>
            <td>
              <p className="text-start whitespace-break-spaces">{memo.memo}</p>
            </td>
            <td>
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
