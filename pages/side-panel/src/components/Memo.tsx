import { overlay } from 'overlay-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TopRightArrow } from '../icons';

import { WEB_URL } from '@extension/shared/constants';
import { useDidMount, useError, useFetch, useThrottle, useUserPreferDarkMode } from '@extension/shared/hooks';
import { MemoStorageType } from '@extension/shared/types';
import { formatUrl, toErrorWithMessage } from '@extension/shared/utils';
import { I18n, MemoStorage, responseUpdateSidePanel, Tab } from '@extension/shared/utils/extension';
import { Toast } from '@extension/ui';

const OPTION_AUTO_SAVE = true;

export default function Memo() {
  const { data: tab, refetch: refetchtab } = useFetch({
    fetchFn: Tab.get,
    defaultValue: {} as chrome.tabs.Tab,
  });
  const { data: memoList } = useFetch<MemoStorageType>({
    fetchFn: MemoStorage.get,
    defaultValue: {} as MemoStorageType,
  });
  const { throttle } = useThrottle();
  const [isSaved, setIsSaved] = useState(true);
  const memoRef = useRef<HTMLTextAreaElement>(null);
  const getMemoValue = useCallback(() => memoRef?.current?.value ?? '', [memoRef]);
  const { isUserPreferDarkMode } = useUserPreferDarkMode();
  const { setError } = useError();

  useDidMount(() => responseUpdateSidePanel(refetchtab));
  useEffect(() => {
    if (!memoRef.current) return;
    memoRef.current.value = memoList?.[formatUrl(tab?.url)]?.memo ?? '';
  }, [memoList, tab?.url]);

  const saveMemoStorage = useCallback(
    async (memo: string) => {
      try {
        await saveMemoStorage(memo);
        setIsSaved(true);
      } catch (error) {
        setError(toErrorWithMessage(I18n.get('toast_error_storage_exceeded')));
      }
    },
    [setError],
  );

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
      if (isSaved) overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMemoStorage(getMemoValue());
    if (isSaved) overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />);
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
