import {
  I18n,
  MemoStorage,
  MemoStorageType,
  responseUpdateSidePanel,
  Tab,
  urlToKey,
  useDidMount,
  useFetch,
} from '@extension/shared';
import { Toast } from '@extension/ui';
import { saveMemoStorage } from '@src/utils';
import { overlay } from 'overlay-kit';
import { useEffect, useState } from 'react';

export default function Memo() {
  const { data: tab, refetch: refetchtab } = useFetch({
    fetchFn: Tab.get,
    defaultValue: {} as chrome.tabs.Tab,
  });
  const { data: memoList, refetch: refetchMemo } = useFetch<MemoStorageType>({
    fetchFn: MemoStorage.get,
    defaultValue: {},
  });

  const [memo, setMemo] = useState('');

  useDidMount(() => responseUpdateSidePanel(refetchtab));

  useEffect(() => setMemo(memoList?.[urlToKey(tab?.url)]?.memo ?? ''), [memoList, tab?.url]);

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await saveMemoStorage(memo);
    overlay.open(({ unmount }) => <Toast message="Saved" onClose={unmount} />);
    await refetchMemo();
  };

  return (
    <form className="form-control h-full" onSubmit={handleFormSubmit}>
      <div className="label">
        <span className="label-text whitespace-nowrap font-bold">{I18n.get('memo')}</span>
        <span className="label-text truncate w-full text-right text-neutral-content">{tab?.title}</span>
      </div>
      <textarea
        className="textarea textarea-bordered h-full resize-none"
        placeholder="memo"
        value={memo}
        onChange={handleTextAreaChange}
      />
      <div className="label">
        <span className="label-text-alt">{memo?.length ?? 0}/1,000</span>
        <button className="label-text-alt" type="submit">
          {I18n.get('save')}
        </button>
      </div>
    </form>
  );
}
