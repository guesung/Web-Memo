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
  Tab,
} from '@extension/shared/utils/extension';
import { cn, Textarea, ToastAction, useToast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import { HeartIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { WEB_URL } from '@extension/shared/constants';

type InputType = GetFormattedMemoProps;

function MemoForm() {
  const { toast } = useToast();
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

  const handleSaveMemoSuccess = () => {
    setIsSaved(true);
    abortThrottle();
  };

  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
    onSuccess: handleSaveMemoSuccess,
    onError: () => {
      toast({ title: '저장에 실패했습니다.' });
    },
  });
  const { mutate: mutateMemoPost } = useMemoPostMutation({
    supabaseClient,
    onSuccess: handleSaveMemoSuccess,
    onError: () => {
      toast({ title: '저장에 실패했습니다.' });
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

  const handleWishListClick = () => {
    if (currentMemo?.id) Tab.create({ url: `${WEB_URL}/memos?wish=true&id=${currentMemo?.id}` });
    else Tab.create({ url: `${WEB_URL}/memos?wish=true` });
  };

  const handleWishClick = async () => {
    const currentIsWish = watch('isWish');

    setValue('isWish', !currentIsWish);

    const getTitle = (isWish: boolean) => {
      if (isWish) return '위시 리스트에서 제거되었습니다.';
      return '위시 리스트에 추가되었습니다.';
    };

    toast({
      title: getTitle(currentIsWish),
      action: (
        <ToastAction altText="바로가기" onClick={handleWishListClick}>
          바로가기
        </ToastAction>
      ),
    });

    await saveMemo();
  };

  return (
    <form className="relative h-full py-1">
      <Textarea
        {...register('memo', {
          onChange: handleMemoTextAreaChange,
        })}
        className={cn('h-full resize-none text-sm', {
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
