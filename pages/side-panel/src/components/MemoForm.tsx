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
import { useForm } from 'react-hook-form';

type InputType = GetFormattedMemoProps;

function MemoForm() {
  const [isSaved, setIsSaved] = useState(true);
  const { throttle, abortThrottle } = useThrottle();
  const { data: tab } = useTabQuery();
  const { data: supabaseClient } = useSupabaseClient({
    getSupabaseClient,
  });
  const { data: currentMemo, refetch: refetchMemo } = useMemoQuery({
    supabaseClient,
    url: tab.url,
  });
  const { register, setValue, watch } = useForm<InputType>({
    defaultValues: {
      memo: '',
      isWish: false,
    },
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
      abortThrottle();
    },
    onError: () => {
      overlay.open(({ unmount }) => <Toast message="메모 저장에 실패했습니다." onClose={unmount} />);
    },
  });

  const saveMemo = async (data?: InputType) => {
    const memo = data?.memo ?? watch('memo');
    const isWish = data?.isWish ?? watch('isWish');

    const formattedMemo = await getFormattedMemo({ memo, isWish });

    if (currentMemo) mutateMemoPatch({ ...formattedMemo, id: currentMemo.id });
    else mutateMemoPost(formattedMemo);
  };

  useDidMount(() => {
    responseRefetchTheMemoList(refetchMemo);
  });

  useEffect(() => {
    if (!tab?.url) return;

    setValue('memo', currentMemo?.memo ?? '');
    setValue('isWish', currentMemo?.isWish ?? false);
  }, [currentMemo?.isWish, currentMemo?.memo, setValue, tab?.url]);

  const handleMemoTextAreaChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue('memo', event.target.value);
    setIsSaved(false);

    throttle(saveMemo);
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();

      await saveMemo();
      abortThrottle();
    }
  };

  const handleWishClick = async () => {
    setValue('isWish', !watch('isWish'));

    await saveMemo();
  };

  return (
    <form className="form-control h-full">
      <textarea
        className={cn('textarea textarea-bordered h-full resize-none border-2', {
          'border-cyan-900 focus:border-cyan-900': !isSaved,
        })}
        id="memo-textarea"
        placeholder="메모"
        onKeyDown={handleKeyDown}
        {...register('memo', {
          onChange: handleMemoTextAreaChange,
        })}
      />
      <div className="label">
        <HeartIcon
          width="16px"
          height="16px"
          fill={watch('isWish') ? 'white' : 'black'}
          onClick={handleWishClick}
          className="cursor-pointer"
        />
      </div>
    </form>
  );
}

export default withAuthentication(MemoForm);
