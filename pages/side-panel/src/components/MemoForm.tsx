import { overlay } from 'overlay-kit';
import { useEffect, useState } from 'react';

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
  responseRefetchTheMemos,
} from '@extension/shared/utils/extension';
import { cn, Textarea, Toast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import { useForm } from 'react-hook-form';
import { HeartIcon } from 'lucide-react';

type InputType = GetFormattedMemoProps;

function MemoForm() {
  // const { toast } = useToast();
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
    onSuccess: () => {
      // toast({ title: '저장 성공' });
    },
  });
  const { mutate: mutateMemoPost } = useMemoPostMutation({
    supabaseClient,
    onSuccess: () => {
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

    if (currentMemo) mutateMemoPatch({ id: currentMemo.id, memoRequest: formattedMemo });
    else mutateMemoPost(formattedMemo);
  };

  useDidMount(() => {
    responseRefetchTheMemos(refetchMemo);
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
    <form className="relative h-full py-1">
      <Textarea
        {...register('memo', {
          onChange: handleMemoTextAreaChange,
        })}
        className={cn('h-full resize-none border-2 text-sm', {
          'border-cyan-900 focus:border-cyan-900': !isSaved,
        })}
        id="memo-textarea"
        placeholder="메모"
        onKeyDown={handleKeyDown}
      />
      <div className="absolute bottom-2 left-2">
        <HeartIcon
          size={16}
          fill={watch('isWish') ? 'pink' : ''}
          fillOpacity={watch('isWish') ? 100 : 0}
          onClick={handleWishClick}
          role="button"
        />
      </div>
    </form>
  );
}

export default withAuthentication(MemoForm);
