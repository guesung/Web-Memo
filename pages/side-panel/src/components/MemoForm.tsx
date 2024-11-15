import { overlay } from 'overlay-kit';
import { useEffect, useState } from 'react';
import HeartIcon from '../../public/svgs/heart.svg';

import {
  useDidMount,
  useMemoPatchMutation,
  useMemoPostMutation,
  useMemoQuery,
  useSupabaseClient,
  useTabQuery,
  useThrottle,
} from '@extension/shared/hooks';
import {
  getFormattedMemo,
  GetFormattedMemoProps,
  getSupabaseClient,
  responseRefetchTheMemoList,
} from '@extension/shared/utils/extension';
import { cn, Toast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';

function MemoForm() {
  const [isSaved, setIsSaved] = useState(true);
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState(['']);
  const { throttle, abortThrottle } = useThrottle();
  const { data: tab } = useTabQuery();
  const { data: supabaseClient } = useSupabaseClient({
    getSupabaseClient,
  });
  const { data: currentMemo, refetch: refetchMemo } = useMemoQuery({
    supabaseClient,
    url: tab.url,
  });

  const isWish = currentMemo?.category?.includes('wish');

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
      abortThrottle();
    },
    onError: () => {
      overlay.open(({ unmount }) => <Toast message="메모 저장에 실패했습니다." onClose={unmount} />);
    },
  });

  const saveMemo = async ({ memo, category }: GetFormattedMemoProps) => {
    const formattedMemo = await getFormattedMemo({ category, memo });

    if (currentMemo) mutateMemoPatch({ ...formattedMemo, id: currentMemo.id });
    else mutateMemoPost(formattedMemo);
  };

  useDidMount(() => {
    responseRefetchTheMemoList(refetchMemo);
  });

  useEffect(() => {
    if (!tab?.url) return;

    setMemo(currentMemo?.memo ?? '');
    setCategory(currentMemo?.category ?? ['']);
  }, [currentMemo?.category, currentMemo?.memo, tab?.url]);

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

  const handleWishClick = async () => {
    const category = getCategoryWithWish();
    setCategory(category);
    const formattedMemo = await getFormattedMemo({ category, memo });

    if (currentMemo) mutateMemoPatch({ ...formattedMemo, id: currentMemo.id });
    else mutateMemoPost(formattedMemo);
  };

  const getCategoryWithWish = () => {
    if (isWish) return [''];
    return ['wish'];
  };

  return (
    <form className="form-control h-full">
      <textarea
        className={cn('textarea textarea-bordered h-full resize-none border-2', {
          'border-cyan-900 focus:border-cyan-900': !isSaved,
        })}
        id="memo-textarea"
        placeholder="메모"
        onChange={handleMemoTextAreaChange}
        onKeyDown={handleKeyDown}
        value={memo}
      />
      <div className="label">
        <HeartIcon
          width="16px"
          height="16px"
          fill={isWish ? 'white' : 'black'}
          onClick={handleWishClick}
          className="cursor-pointer"
        />
      </div>
    </form>
  );
}

export default withAuthentication(MemoForm);
