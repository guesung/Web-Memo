import {
  I18n,
  MemoStorage,
  MemoStorageType,
  responseUpdateSidePanel,
  Tab,
  formatUrl,
  useDidMount,
  useFetch,
  useSession,
  useThrottle,
} from '@extension/shared';
import { Toast } from '@extension/ui';
import { saveMemoStorage, saveMemoSupabase } from '@src/utils';
import { overlay } from 'overlay-kit';
import { useCallback, useEffect, useState } from 'react';

const OPTION_AUTO_SAVE = true;

export default function Memo() {
  const { data: tab, refetch: refetchtab } = useFetch({
    fetchFn: Tab.get,
    defaultValue: {} as chrome.tabs.Tab,
  });
  const { data: memoList, refetch: refetchMemo } = useFetch<MemoStorageType>({
    fetchFn: MemoStorage.get,
    defaultValue: {} as MemoStorageType,
  });
  const { throttle } = useThrottle();
  const [memo, setMemo] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const session = useSession();

  useDidMount(() => responseUpdateSidePanel(refetchtab));
  useEffect(() => setMemo(memoList?.[formatUrl(tab?.url)]?.memo ?? ''), [memoList, tab?.url]);

  const saveMemoAndRefetchStorage = useCallback(
    async (memo: string) => {
      if (session) await saveMemoSupabase(memo);
      await saveMemoStorage(memo);

      setIsSaved(true);
      await refetchMemo();
    },
    [refetchMemo, session],
  );

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
    if (!OPTION_AUTO_SAVE) return;
    setIsSaved(false);
    throttle(async () => {
      await saveMemoAndRefetchStorage(e.target.value);
    });
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMemoAndRefetchStorage(memo);
    overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />);
  };

  return (
    <form className="form-control h-full" onSubmit={handleFormSubmit}>
      <div className="label">
        <span className="label-text whitespace-nowrap font-bold">{I18n.get('memo')}</span>
        <span className="w-4" />
        <span className="label-text truncate w-full text-right text-neutral-content">{tab?.title}</span>
      </div>
      <textarea
        className="textarea textarea-bordered h-full resize-none"
        placeholder="memo"
        value={memo}
        onChange={handleTextAreaChange}
      />
      <div className="label">
        {isSaved ? <span /> : <span className="loading loading-ring loading-xs" />}
        <button className="label-text-alt" type="submit">
          {I18n.get('save')}
        </button>
      </div>
    </form>
  );
}
