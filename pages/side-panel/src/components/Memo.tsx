import { overlay } from 'overlay-kit';
import { useEffect, useState } from 'react';
import { TopRightArrow } from '../icons';

import { WEB_URL } from '@extension/shared/constants';
import {
  useDidMount,
  useMemoListQuery,
  useMemoPostMutation,
  useTabQuery,
  useUserPreferDarkMode,
} from '@extension/shared/hooks';
import { MemoSupabaseResponse } from '@extension/shared/types';
import { getFormattedMemo, I18n, responseUpdateSidePanel, Tab } from '@extension/shared/utils/extension';
import { Toast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import { UseQueryResult } from '@tanstack/react-query';

function Memo() {
  const [isSaved, setIsSaved] = useState(true);
  const [memo, setMemo] = useState('');
  const { data: tab, refetch: refetchTab } = useTabQuery();
  // TODO :타입 에러로 인해 타입 단언으로 일단 해결
  const { data: memoList }: UseQueryResult<MemoSupabaseResponse, Error> = useMemoListQuery();
  const { mutate: mutateMemo } = useMemoPostMutation({
    handleSettled: () => {
      setIsSaved(true);
    },
  });

  const { isUserPreferDarkMode } = useUserPreferDarkMode();

  useDidMount(() =>
    responseUpdateSidePanel(() => {
      setIsSaved(true);
      refetchTab();
    }),
  );

  useEffect(() => {
    if (!tab?.url) return;
    const currentMemo = memoList?.data?.find(memo => memo.url === tab.url)?.memo ?? '';

    setMemo(currentMemo);
  }, [memoList, tab?.url]);

  const handleMemoClick = () => {
    Tab.create({ url: `${WEB_URL}/memos` });
  };

  const handleTextAreaChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIsSaved(false);
    setMemo(event.target.value);
  };

  const handleTextAreaKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey && e.key === 's') {
      e.preventDefault();
      const formattedMemo = await getFormattedMemo(memo);
      mutateMemo(formattedMemo, {
        onSuccess: () => overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />),
      });
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formattedMemo = await getFormattedMemo(memo);
    mutateMemo(formattedMemo, {
      onSuccess: () => overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />),
    });
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
        value={memo}
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
