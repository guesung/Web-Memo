import {
  useDidMount,
  useMemoPatchMutation,
  useMemoPostMutation,
  useMemoQuery,
  useThrottle,
} from '@extension/shared/hooks';
import { useTabQuery } from '@extension/shared/hooks/extension';
import { getMemoInfo, I18n, responseRefetchTheMemos, Tab } from '@extension/shared/utils/extension';
import { cn, Textarea, toast, ToastAction } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import { MemoInput } from '@src/types/Input';
import { getMemoWishListUrl } from '@src/utils';
import { HeartIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

function MemoForm() {
  const { throttle, abortThrottle } = useThrottle();
  const { data: tab } = useTabQuery();
  const { memo: memoData, refetch: refetchMemo } = useMemoQuery({
    url: tab.url,
  });
  const { register, setValue, watch } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
      isWish: false,
    },
  });

  const { mutate: mutateMemoPatch } = useMemoPatchMutation();
  const { mutate: mutateMemoPost } = useMemoPostMutation();

  const saveMemo = async () => {
    abortThrottle();

    const memoInfo = await getMemoInfo();

    const memo = { ...memoInfo, memo: watch('memo'), isWish: watch('isWish') };

    if (memoData) mutateMemoPatch({ id: memoData.id, request: memo });
    else mutateMemoPost(memo);
  };

  useDidMount(() => {
    responseRefetchTheMemos(refetchMemo);
  });

  useEffect(() => {
    setValue('memo', memoData?.memo ?? '');
    setValue('isWish', memoData?.isWish ?? false);
  }, [memoData?.memo, memoData?.isWish, setValue]);

  const handleMemoTextAreaChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue('memo', event.target.value);

    throttle(saveMemo, 300);
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') {
      event.preventDefault();

      await saveMemo();
    }
  };

  const handleWishClick = async () => {
    setValue('isWish', !watch('isWish'));

    await saveMemo();

    const getWishToastTitle = (isWish: boolean) => {
      if (isWish) return I18n.get('wish_list_deleted');
      return I18n.get('wish_list_added');
    };

    const handleWishListClick = () => {
      const memoWishListUrl = getMemoWishListUrl(memoData?.id);

      Tab.create({ url: memoWishListUrl });
    };

    toast({
      title: getWishToastTitle(!watch('isWish')),
      action: (
        <ToastAction altText={I18n.get('go_to')} onClick={handleWishListClick}>
          {I18n.get('go_to')}
        </ToastAction>
      ),
    });
  };

  return (
    <form className="relative flex h-full flex-col gap-1 py-1">
      <Textarea
        {...register('memo', {
          onChange: handleMemoTextAreaChange,
        })}
        className={cn('flex-1 resize-none text-sm outline-none')}
        id="memo-textarea"
        placeholder={I18n.get('memo')}
        onKeyDown={handleKeyDown}
      />
      <div>
        <HeartIcon
          size={16}
          fill={memoData?.isWish ? 'pink' : ''}
          fillOpacity={memoData?.isWish ? 100 : 0}
          onClick={handleWishClick}
          role="button"
          className={cn('cursor-pointer transition-transform hover:scale-110 active:scale-95', {
            'animate-heart-pop': memoData?.isWish,
          })}
        />
      </div>
    </form>
  );
}

export default withAuthentication(MemoForm);
