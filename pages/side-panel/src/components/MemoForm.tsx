import { useEffect, useState } from 'react';

import {
  useDidMount,
  useMemoPatchMutation,
  useMemoPostMutation,
  useMemoQuery,
  useThrottle,
} from '@extension/shared/hooks';
import { useSupabaseClientQuery, useTabQuery } from '@extension/shared/hooks/extension';
import { getFormattedMemo, I18n, responseRefetchTheMemos, Tab } from '@extension/shared/utils/extension';
import { cn, Textarea, ToastAction, useToast } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import { MemoInput } from '@src/types/Input';
import { getMemoWishListUrl } from '@src/utils';
import { HeartIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

function MemoForm() {
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(true);
  const { throttle, abortThrottle } = useThrottle();
  const { data: tab } = useTabQuery();
  const { data: supabaseClient } = useSupabaseClientQuery();
  const { data: currentMemo, refetch: refetchMemo } = useMemoQuery({
    supabaseClient,
    url: tab.url,
  });
  const { register, setValue, watch } = useForm<MemoInput>({
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
      toast({ title: I18n.get('toast_error_save') });
    },
  });
  const { mutate: mutateMemoPost } = useMemoPostMutation({
    supabaseClient,
    onSuccess: handleSaveMemoSuccess,
    onError: () => {
      toast({ title: I18n.get('toast_error_save') });
    },
  });

  const saveMemo = async (data?: MemoInput) => {
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

  const getTitle = (isWish: boolean) => {
    if (isWish) return I18n.get('wish_list_deleted');
    return I18n.get('wish_list_added');
  };

  const handleWishListClick = () => {
    const memoWishListUrl = getMemoWishListUrl(currentMemo?.id);

    Tab.create({ url: memoWishListUrl });
  };

  const handleWishClick = async () => {
    const currentIsWish = watch('isWish');

    setValue('isWish', !currentIsWish);

    toast({
      title: getTitle(currentIsWish),
      action: (
        <ToastAction altText={I18n.get('go_to')} onClick={handleWishListClick}>
          {I18n.get('go_to')}
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
        placeholder={I18n.get('memo')}
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
