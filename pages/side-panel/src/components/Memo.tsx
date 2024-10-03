import { overlay } from 'overlay-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TopRightArrow } from '../icons';

import { WEB_URL } from '@extension/shared/constants';
import { useDidMount, useThrottle, useUserPreferDarkMode } from '@extension/shared/hooks';
import { I18n, responseUpdateSidePanel, Tab } from '@extension/shared/utils/extension';
import { Toast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import { useMemoListQuery, useMemoMutation, useTabQuery } from '@src/hooks';

function Memo() {
  const [isSaved, setIsSaved] = useState(true);
  const memoRef = useRef<HTMLTextAreaElement>(null);
  const getMemoValue = useCallback(() => memoRef?.current?.value ?? '', [memoRef]);
  const { throttle, abortThrottle } = useThrottle();
  const { data: tab, refetch: refetchTab } = useTabQuery();
  const { data: memoList, refetch: refetchMemoList } = useMemoListQuery();
  const { mutate: mutateMemo } = useMemoMutation({
    onSuccess: () => overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />),
  });

  const { isUserPreferDarkMode } = useUserPreferDarkMode();

  useDidMount(() =>
    responseUpdateSidePanel(() => {
      refetchTab();
      refetchMemoList();
      abortThrottle();
    }),
  );

  useEffect(() => {
    if (!memoRef.current || !tab?.url) return;
    memoRef.current.value = memoList?.data?.find(memo => memo.url === tab.url)?.memo ?? '';
  }, [memoList, tab?.url]);

  const handleMemoClick = () => {
    Tab.create({ url: `${WEB_URL}/memo` });
  };

  const handleTextAreaChange = () => {
    setIsSaved(false);
    throttle(() => mutateMemo(getMemoValue()));
  };

  const handleTextAreaKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey && e.key === 's') {
      e.preventDefault();
      mutateMemo(getMemoValue());
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutateMemo(getMemoValue());
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

export default withAuthentication(Memo);
