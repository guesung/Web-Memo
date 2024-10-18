import { overlay } from 'overlay-kit';
import { useEffect, useState } from 'react';

import {
  useDidMount,
  useMemoListQuery,
  useMemoPatchMutation,
  useMemoPostMutation,
  useSupabaseClient,
  useTabQuery,
  useThrottle,
} from '@extension/shared/hooks';
import { formatUrl } from '@extension/shared/utils';
import {
  getFormattedMemo,
  GetFormattedMemoProps,
  getSupabaseClient,
  responseRefetchTheMemoList,
  responseUpdateSidePanel,
} from '@extension/shared/utils/extension';
import { cn, Toast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';

function MemoForm() {
  const [isSaved, setIsSaved] = useState(true);
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState('');
  const { throttle, abortThrottle } = useThrottle();
  const { data: tab } = useTabQuery();
  const { data: supabaseClient } = useSupabaseClient({
    getSupabaseClient,
  });
  const { data: memoList, refetch: refetchMemoList } = useMemoListQuery({
    supabaseClient,
  });
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
    handleSuccess: () => {
      setIsSaved(true);
      abortThrottle();
    },
    onError: () => {
      overlay.open(({ unmount }) => <Toast message="메모 저장에 실패했습니다." onClose={unmount} />);
    },
  });
  const { mutate: mutateMemoPost } = useMemoPostMutation({
    supabaseClient,
    handleSuccess: () => {
      setIsSaved(true);
    },
    onError: () => {
      overlay.open(({ unmount }) => <Toast message="메모 저장에 실패했습니다." onClose={unmount} />);
    },
  });

  const saveMemo = async ({ memo, category }: GetFormattedMemoProps) => {
    const currentMemo = memoList?.data?.find(memo => memo.url === formatUrl(tab.url));
    const formattedMemo = await getFormattedMemo({ category, memo });

    if (currentMemo) mutateMemoPatch({ ...formattedMemo, id: currentMemo.id });
    else mutateMemoPost(formattedMemo);
  };

  useDidMount(() =>
    responseUpdateSidePanel(() => {
      setIsSaved(true);
      abortThrottle();
    }),
  );
  useDidMount(() => {
    responseRefetchTheMemoList(refetchMemoList);
  });

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
      await saveMemo({ memo: event.target.value, category });
    });
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();

      await saveMemo({ memo, category });
      abortThrottle();
    }
  };

  return (
    <form className="form-control h-full">
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
      <div className="label" />
    </form>
  );
}

export default withAuthentication(MemoForm);
