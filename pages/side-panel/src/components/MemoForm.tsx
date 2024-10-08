import { overlay } from 'overlay-kit';
import { useEffect, useState } from 'react';

import {
  useDidMount,
  useMemoListQuery,
  useMemoPostMutation,
  useSupabaseClient,
  useTabQuery,
  useThrottle,
} from '@extension/shared/hooks';
import { MemoSupabaseResponse } from '@extension/shared/types';
import { getFormattedMemo, getSupabaseClient, I18n, responseUpdateSidePanel } from '@extension/shared/utils/extension';
import { Toast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import { UseQueryResult } from '@tanstack/react-query';

function MemoForm() {
  const [isSaved, setIsSaved] = useState(true);
  const [memo, setMemo] = useState('');
  const { throttle, abortThrottle } = useThrottle();
  const { data: tab } = useTabQuery();
  const { data: supabaseClient } = useSupabaseClient({
    getSupabaseClient,
  });
  // TODO :타입 에러로 인해 타입 단언으로 임시 해결
  const { data: memoList }: UseQueryResult<MemoSupabaseResponse, Error> = useMemoListQuery({ supabaseClient });
  const { mutate: mutateMemo } = useMemoPostMutation({
    supabaseClient,
    handleSettled: () => {
      abortThrottle();
      setIsSaved(true);
    },
  });

  useDidMount(() =>
    responseUpdateSidePanel(() => {
      setIsSaved(true);
      abortThrottle();
    }),
  );

  useEffect(() => {
    if (!tab?.url) return;
    const currentMemo = memoList?.data?.find(memo => memo.url === tab.url)?.memo ?? '';

    setMemo(currentMemo);
  }, [memoList, tab?.url]);

  const handleTextAreaChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(event.target.value);
    setIsSaved(false);

    throttle(async () => {
      setIsSaved(true);
      const formattedMemo = await getFormattedMemo(event.target.value);
      mutateMemo(formattedMemo);
    });
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

export default withAuthentication(MemoForm);
