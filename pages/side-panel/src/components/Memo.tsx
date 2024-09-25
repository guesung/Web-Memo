import {
  I18n,
  isUserPreferDarkMode,
  MemoStorage,
  MemoStorageType,
  responseUpdateSidePanel,
  Tab,
  urlToKey,
  useDidMount,
  useFetch,
  useThrottle,
  WEB_URL,
} from '@extension/shared';
import { Toast } from '@extension/ui';
import { saveMemoStorage } from '@src/utils';
import { overlay } from 'overlay-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TopRightArrow } from '../icons';

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
  const [isSaved, setIsSaved] = useState(true);
  const memoRef = useRef<HTMLTextAreaElement>(null);
  const getMemoValue = useCallback(() => memoRef?.current?.value ?? '', [memoRef]);

  useDidMount(() => responseUpdateSidePanel(refetchtab));
  useEffect(() => {
    if (!memoRef.current) return;
    memoRef.current.value = memoList?.[urlToKey(tab?.url)]?.memo ?? '';
  }, [memoList, tab?.url]);

  const saveMemoAndRefetchStorage = useCallback(
    async (memo: string, showOverlay = false) => {
      await saveMemoStorage(memo);
      setIsSaved(true);
      await refetchMemo();
      if (showOverlay) overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />);
    },
    [refetchMemo],
  );

  const handleMemoClick = () => {
    Tab.create({ url: `${WEB_URL}/memo` });
  };

  const handleTextAreaChange = () => {
    if (!OPTION_AUTO_SAVE) return;
    setIsSaved(false);
    throttle(async () => {
      await saveMemoAndRefetchStorage(getMemoValue());
    });
  };

  const handleTextAreaKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey && e.key === 's') {
      e.preventDefault();
      await saveMemoAndRefetchStorage(getMemoValue(), true);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMemoAndRefetchStorage(getMemoValue(), true);
  };

  return (
    <form className="form-control h-full" onSubmit={handleFormSubmit}>
      <div className="label">
        <span className="label-text whitespace-nowrap font-bold">{I18n.get('memo')}</span>
        <span className="w-1" />
        <TopRightArrow
          width={20}
          height={20}
          fill={isUserPreferDarkMode ? 'black' : 'white'}
          onClick={handleMemoClick}
          className="cursor-pointer"
        />
        <span className="w-4" />
        <span className="label-text truncate w-full text-right">{tab?.title}</span>
      </div>
      <textarea
        className="textarea textarea-bordered h-full resize-none"
        placeholder="memo"
        onChange={handleTextAreaChange}
        onKeyDown={handleTextAreaKeyDown}
        ref={memoRef}
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
