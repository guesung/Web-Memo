import { overlay } from 'overlay-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopRightArrow } from '../icons';

import { WEB_URL } from '@extension/shared/constants';
import { useDidMount, useFetch, useThrottle, useUserPreferDarkMode } from '@extension/shared/hooks';
import type { MemoSupabaseResponse } from '@extension/shared/types';
import { formatUrl, getMemoSupabase, insertMemo, updateMemo } from '@extension/shared/utils';
import {
  getFormattedMemo,
  getSupabaseClient,
  I18n,
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
  const getMemoList = async () => {
    const supabaseClient = await getSupabaseClient();
    return await getMemoSupabase(supabaseClient);
  };
  const { data: memoList, refetch: refetchMemoList } = useFetch<MemoSupabaseResponse>({
    fetchFn: getMemoList,
    defaultValue: {} as MemoSupabaseResponse,
  });
  const currentMemo = useMemo(
    () => memoList?.data?.find(memo => memo.url === formatUrl(tab?.url)),
    [memoList?.data, tab?.url],
  );

  const [isSaved, setIsSaved] = useState(true);

  const memoRef = useRef<HTMLTextAreaElement>(null);
  const getMemoValue = useCallback(() => memoRef?.current?.value ?? '', [memoRef]);

  const { throttle, abortThrottle } = useThrottle();
  const { isUserPreferDarkMode } = useUserPreferDarkMode();

  useDidMount(() =>
    responseUpdateSidePanel(() => {
      refetchtab();
      refetchMemoList();
      abortThrottle();
    }),
  );

  useEffect(() => {
    if (!memoRef.current || !tab?.url) return;
    memoRef.current.value = memoList?.data?.find(memo => memo.url === tab.url)?.memo ?? '';
  }, [memoList, tab?.url]);

  const saveMemo = useCallback(
    async (memo: string) => {
      const supabaseClient = await getSupabaseClient();

      if (currentMemo) await updateMemo(supabaseClient, { ...currentMemo, memo });
      else insertMemo(supabaseClient, await getFormattedMemo(memo));
      setIsSaved(true);
    },
    [currentMemo],
  );

  const handleMemoClick = () => {
    Tab.create({ url: `${WEB_URL}/memo` });
  };

  const handleTextAreaChange = () => {
    if (!OPTION_AUTO_SAVE) return;
    setIsSaved(false);
    throttle(() => saveMemo(getMemoValue()));
  };

  const handleTextAreaKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey && e.key === 's') {
      e.preventDefault();
      await saveMemo(getMemoValue());
      overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMemo(getMemoValue());
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
