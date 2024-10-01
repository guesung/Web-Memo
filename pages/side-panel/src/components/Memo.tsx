import { overlay } from 'overlay-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TopRightArrow } from '../icons';

import { WEB_URL } from '@extension/shared/constants';
import { useDidMount, useFetch, useThrottle, useUserPreferDarkMode } from '@extension/shared/hooks';
import { MemoType } from '@extension/shared/types';
import {
  getFormattedMemo,
  getMemoList,
  I18n,
  MemoStorage,
  responseUpdateSidePanel,
  Tab,
} from '@extension/shared/utils/extension';
import { Toast } from '@extension/ui';

const OPTION_AUTO_SAVE = true;

export default function Memo() {
  const { data: tab, refetch: refetchtab } = useFetch({
    fetchFn: Tab.get,
    defaultValue: {} as chrome.tabs.Tab,
  });
  const { data: memoList, refetch: refetchMemoList } = useFetch<MemoType[]>({
    fetchFn: getMemoList,
    defaultValue: [] as MemoType[],
  });
  const [isSaved, setIsSaved] = useState(true);

  const memoRef = useRef<HTMLTextAreaElement>(null);
  const getMemoValue = useCallback(() => memoRef?.current?.value ?? '', [memoRef]);

  const { throttle } = useThrottle();
  const { isUserPreferDarkMode } = useUserPreferDarkMode();

  useDidMount(() =>
    responseUpdateSidePanel(() => {
      refetchtab();
      refetchMemoList();
    }),
  );

  useEffect(() => {
    if (!memoRef.current || !tab?.url) return;
    memoRef.current.value = memoList?.find(memo => memo.url === tab.url)?.memo ?? '';
  }, [memoList, tab?.url]);

  const saveMemoStorage = useCallback(async (memo: string) => {
    try {
      const memoData = await getFormattedMemo(memo);
      const urlKey = memoData.url;

      await MemoStorage.set(urlKey, memoData);
      setIsSaved(true);
    } catch (error) {
      overlay.open(({ unmount }) => <Toast message={I18n.get('toast_error_storage_exceeded')} onClose={unmount} />);
    }
  }, []);

  const handleMemoClick = () => {
    Tab.create({ url: `${WEB_URL}/memo` });
  };

  const handleTextAreaChange = () => {
    if (!OPTION_AUTO_SAVE) return;
    setIsSaved(false);
    throttle(() => saveMemoStorage(getMemoValue()));
  };

  const handleTextAreaKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey && e.key === 's') {
      e.preventDefault();
      await saveMemoStorage(getMemoValue());
      overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMemoStorage(getMemoValue());
    overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />);
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
        id="memo-textarea"
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
