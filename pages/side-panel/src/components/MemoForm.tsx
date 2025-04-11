import {
  useDebounce,
  useDidMount,
  useMemoPatchMutation,
  useMemoPostMutation,
  useMemoQuery,
  useTabQuery,
} from '@extension/shared/hooks';
import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import { getMemoInfo, I18n, Tab } from '@extension/shared/utils/extension';
import { cn, Textarea, toast, ToastAction } from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import type { MemoInput } from '@src/types/Input';
import { getMemoUrl } from '@src/utils';
import { HeartIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

function MemoForm() {
  const { debounce } = useDebounce();
  const { data: tab } = useTabQuery();
  const { memo: memoData, refetch: refetchMemo } = useMemoQuery({
    url: tab.url,
  });
  const { register, setValue, watch } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
      isWish: false,
      tags: [],
    },
  });

  const { mutate: mutateMemoPatch } = useMemoPatchMutation();
  const { mutate: mutateMemoPost } = useMemoPostMutation();

  const saveMemo = async () => {
    const memoInfo = await getMemoInfo();

    const memo = {
      ...memoInfo,
      memo: watch('memo'),
      isWish: watch('isWish'),
      tags: watch('tags'),
    };

    if (memoData) mutateMemoPatch({ id: memoData.id, request: memo });
    else mutateMemoPost(memo);
  };

  useDidMount(() => {
    ExtensionBridge.responseRefetchTheMemos(refetchMemo);
  });

  useEffect(() => {
    setValue('memo', memoData?.memo ?? '');
    setValue('isWish', memoData?.isWish ?? false);
    setValue('tags', memoData?.tags ?? []);
  }, [memoData?.memo, memoData?.isWish, memoData?.tags, setValue]);

  const handleMemoTextAreaChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setValue('memo', text);
    debounce(saveMemo);
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.metaKey && event.key === 's') event.preventDefault();

    if (event.key === ' ') {
      const text = event.currentTarget.value;
      const normalizedText = text.replace(/\n/g, ' ');
      const words = normalizedText.split(' ');
      const lastWord = words[words.length - 1];

      if (lastWord.startsWith('#') && lastWord.length > 1) {
        event.preventDefault();
        const newTag = lastWord.substring(1);
        const currentTags = watch('tags') || [];

        if (!currentTags.includes(newTag)) {
          const newText = text.slice(0, -lastWord.length) + ' ';
          setValue('memo', newText);

          setValue('tags', [...currentTags, newTag]);

          await saveMemo();
        }
      }
    }
  };

  const handleWishClick = async () => {
    setValue('isWish', !watch('isWish'));

    await saveMemo();

    const getWishToastTitle = (isWish: boolean) => {
      if (isWish) return I18n.get('wish_list_added');
      return I18n.get('wish_list_deleted');
    };

    const handleWishListClick = () => {
      const memoWishListUrl = getMemoUrl({ id: memoData?.id, isWish: watch('isWish') });

      Tab.create({ url: memoWishListUrl });
    };

    toast({
      title: getWishToastTitle(watch('isWish')),
      action: (
        <ToastAction altText={I18n.get('go_to')} onClick={handleWishListClick}>
          {I18n.get('go_to')}
        </ToastAction>
      ),
    });
  };

  const handleTagRemove = (tagToRemove: string) => {
    const currentTags = watch('tags') || [];
    setValue(
      'tags',
      currentTags.filter(tag => tag !== tagToRemove),
    );
    debounce(saveMemo);
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
      <div className="flex items-center gap-2">
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
        <div className="flex flex-wrap gap-1">
          {watch('tags')?.map(tag => (
            <button
              key={tag}
              type="button"
              className="cursor-pointer rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
              onClick={() => handleTagRemove(tag)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTagRemove(tag);
                }
              }}>
              {tag}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

export default withAuthentication(MemoForm);
