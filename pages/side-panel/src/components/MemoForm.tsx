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
import { cn, Toast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import { UseQueryResult } from '@tanstack/react-query';

function MemoForm() {
  const [isSaved, setIsSaved] = useState(true);
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState('');
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
      setIsSaved(true);
      abortThrottle();
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

    const currentMemo = memoList?.data?.find(memo => memo.url === tab.url);

    setMemo(currentMemo?.memo ?? '');
    setCategory(currentMemo?.category ?? '');
  }, [memoList, tab?.url]);

  const handleMemoTextAreaChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(event.target.value);
    setIsSaved(false);

    throttle(async () => {
      setIsSaved(true);
      const formattedMemo = await getFormattedMemo({ memo: event.target.value, category });
      mutateMemo(formattedMemo);
    });
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();

      const formattedMemo = await getFormattedMemo({ memo, category });
      mutateMemo(formattedMemo, {
        onSuccess: () => overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />),
      });
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formattedMemo = await getFormattedMemo({ memo, category });

    mutateMemo(formattedMemo, {
      onSuccess: () => overlay.open(({ unmount }) => <Toast message={I18n.get('toast_saved')} onClose={unmount} />),
    });
  };

  return (
    <form className="form-control h-full" onSubmit={handleFormSubmit}>
      <textarea
        className={cn('textarea textarea-bordered h-full border-2 resize-none', {
          'border-cyan-900 focus:border-cyan-900': !isSaved,
        })}
        id="memo-textarea"
        placeholder="메모"
        onChange={handleMemoTextAreaChange}
        onKeyDown={handleKeyDown}
        value={memo}
      />
      <div className="label">
        <span />
        <button className="label-text-alt" type="submit">
          {I18n.get('save')}
        </button>
      </div>
    </form>
  );
}

export default withAuthentication(MemoForm);
