import {
  useCategoryQuery,
  useDebounce,
  useDidMount,
  useMemoPatchMutation,
  useMemoPostMutation,
  useMemoQuery,
  useTabQuery,
} from '@extension/shared/hooks';
import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import type { CategoryRow } from '@extension/shared/types';
import { getMemoInfo, I18n, Tab } from '@extension/shared/utils/extension';
import {
  Badge,
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Textarea,
  toast,
  ToastAction,
} from '@extension/ui';
import withAuthentication from '@src/hoc/withAuthentication';
import type { MemoInput } from '@src/types/Input';
import { getMemoUrl } from '@src/utils';
import { HeartIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

const getCursorPosition = (textarea: HTMLTextAreaElement, position: number) => {
  const div = document.createElement('div');
  div.style.cssText = window.getComputedStyle(textarea, null).cssText;
  div.style.height = 'auto';
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';

  const textBeforeCursor = textarea.value.substring(0, position);
  div.textContent = textBeforeCursor;
  document.body.appendChild(div);

  const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
  const lines = textBeforeCursor.split('\n');
  const currentLineText = lines[lines.length - 1];

  const span = document.createElement('span');
  span.textContent = currentLineText;
  div.appendChild(span);

  const cursorLeft = span.offsetWidth;
  const cursorTop = (lines.length - 1) * lineHeight;

  document.body.removeChild(div);

  return {
    left: cursorLeft,
    top: cursorTop,
  };
};

function MemoForm() {
  const { debounce } = useDebounce();
  const { data: tab } = useTabQuery();
  const { memo: memoData, refetch: refetchMemo } = useMemoQuery({
    url: tab.url,
  });
  const { categories } = useCategoryQuery();
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [categoryInputPosition, setCategoryInputPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  const { register, setValue, watch } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
      isWish: false,
      categoryId: null,
    },
  });
  const { ref, ...rest } = register('memo');

  const { mutate: mutateMemoPatch } = useMemoPatchMutation();
  const { mutate: mutateMemo } = useMemoPostMutation();

  const saveMemo = async ({ memo, isWish, categoryId }: MemoInput) => {
    const memoInfo = await getMemoInfo();

    const totalMemo = {
      ...memoInfo,
      memo,
      isWish,
      category_id: categoryId,
    };

    if (memoData) mutateMemoPatch({ id: memoData.id, request: totalMemo });
    else mutateMemo(totalMemo);
  };

  useDidMount(() => {
    ExtensionBridge.responseRefetchTheMemos(refetchMemo);
  });

  useEffect(() => {
    setValue('memo', memoData?.memo ?? '');
    setValue('isWish', memoData?.isWish ?? false);
    setValue('categoryId', memoData?.category_id ?? null);
  }, [memoData?.memo, memoData?.isWish, memoData?.category_id, setValue]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === '#') {
      event.preventDefault();

      const textarea = event.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const rect = textarea.getBoundingClientRect();
      const { left, top } = getCursorPosition(textarea, cursorPosition);
      const scrollTop = textarea.scrollTop;

      setCategoryInputPosition({
        top: rect.top + top - scrollTop,
        left: rect.left + left,
      });
      setShowCategoryList(true);

      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 0);
    }
  };

  const handleMemoChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setValue('memo', text);
    debounce(() => saveMemo({ memo: text, isWish: watch('isWish'), categoryId: watch('categoryId') }));
  };

  const handleCategorySelect = (category: CategoryRow) => {
    setShowCategoryList(false);

    setValue('categoryId', category.id);

    if (textareaRef.current) textareaRef.current.focus();

    saveMemo({ memo: watch('memo'), isWish: watch('isWish'), categoryId: category.id });
  };

  const handleCategoryRemove = () => {
    setValue('categoryId', null);
    debounce(() => saveMemo({ memo: watch('memo'), isWish: watch('isWish'), categoryId: null }));
  };

  const handleWishClick = async () => {
    const newIsWish = !watch('isWish');
    setValue('isWish', newIsWish);

    await saveMemo({ memo: watch('memo'), isWish: newIsWish, categoryId: watch('categoryId') });

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

  return (
    <form className="relative flex h-full flex-col gap-1 py-1">
      <Textarea
        {...register('memo', {
          onChange: handleMemoChange,
        })}
        {...rest}
        ref={e => {
          ref(e);
          textareaRef.current = e;
        }}
        onKeyDown={handleKeyDown}
        className={cn('flex-1 resize-none text-sm outline-none')}
        id="memo-textarea"
        placeholder={I18n.get('memo')}
      />
      {showCategoryList && (
        <div
          className="fixed z-50 w-64 rounded-md bg-white shadow-lg"
          style={{
            top: categoryInputPosition.top + 'px',
            left: categoryInputPosition.left + 'px',
          }}>
          <Command>
            <CommandInput
              ref={commandInputRef}
              placeholder={I18n.get('search_category')}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  setValue('memo', watch('memo') + '#');
                  setShowCategoryList(false);
                  textareaRef.current?.focus();
                }
              }}
            />
            <CommandList>
              <CommandEmpty>{I18n.get('no_categories_found')}</CommandEmpty>
              <CommandGroup>
                {categories?.map(category => (
                  <CommandItem
                    key={category.id}
                    onSelect={() => handleCategorySelect(category)}
                    className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || '#888888' }} />
                    {category.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
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
        </div>
        {watch('categoryId') && (
          <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: categories?.find(c => c.id === watch('categoryId'))?.color || '#888888' }}
            />
            {categories?.find(c => c.id === watch('categoryId'))?.name}
            <XIcon size={12} className="hover:text-destructive ml-1 cursor-pointer" onClick={handleCategoryRemove} />
          </Badge>
        )}
      </div>
    </form>
  );
}

export default withAuthentication(MemoForm);
