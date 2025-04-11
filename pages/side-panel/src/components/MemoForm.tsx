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
  // Create a dummy element to measure text
  const div = document.createElement('div');
  div.style.cssText = window.getComputedStyle(textarea, null).cssText;
  div.style.height = 'auto';
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';

  // Get text before cursor
  const textBeforeCursor = textarea.value.substring(0, position);
  div.textContent = textBeforeCursor;
  document.body.appendChild(div);

  // Calculate cursor position
  const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
  const lines = textBeforeCursor.split('\n');
  const currentLineText = lines[lines.length - 1];

  // Create a span for the current line to measure exact width
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<{ id: number; name: string; color: string | null } | null>(
    null,
  );

  const { register, setValue, watch } = useForm<MemoInput>({
    defaultValues: {
      memo: '',
      isWish: false,
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
      category_id: selectedCategory?.id,
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
    // 초기 카테고리 설정
    if (memoData?.category_id) {
      const category = categories?.find(c => c.id === memoData.category_id);
      if (category) {
        setSelectedCategory(category);
      }
    }
  }, [memoData?.memo, memoData?.isWish, memoData?.category_id, categories, setValue]);

  const handleMemoTextAreaChange = async (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = event.target.value;
    setValue('memo', text);

    const cursorPosition = event.target.selectionStart;
    const lastChar = text.charAt(cursorPosition - 1);

    if (lastChar === '#') {
      const textarea = event.target;
      const rect = textarea.getBoundingClientRect();
      const { left, top } = getCursorPosition(textarea, cursorPosition);
      const scrollTop = textarea.scrollTop;

      setCategoryInputPosition({
        top: rect.top + top - scrollTop,
        left: rect.left + left,
      });
      setShowCategoryList(true);

      const newText = text.slice(0, cursorPosition - 1) + text.slice(cursorPosition);
      setValue('memo', newText);
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorPosition - 1;
        textareaRef.current.selectionEnd = cursorPosition - 1;
      }

      // Focus the CommandInput after a short delay to ensure the component is mounted
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 0);
    } else {
      setShowCategoryList(false);
    }

    debounce(saveMemo);
  };

  const handleCategorySelect = (category: { id: number; name: string; color: string | null }) => {
    setShowCategoryList(false);
    setSelectedCategory(category);

    // Remove the # character from the memo text
    const currentMemo = watch('memo');
    console.log(currentMemo);
    const lastHashIndex = currentMemo.lastIndexOf('#');
    if (lastHashIndex !== -1) {
      const newText = currentMemo.slice(0, lastHashIndex) + currentMemo.slice(lastHashIndex + 1);
      setValue('memo', newText);
    }

    // Don't add category name to the text anymore
    if (textareaRef.current) {
      textareaRef.current.focus();
    }

    debounce(saveMemo);
  };

  const handleRemoveCategory = () => {
    setSelectedCategory(null);
    debounce(saveMemo);
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

  return (
    <form className="relative flex h-full flex-col gap-1 py-1">
      <Textarea
        {...register('memo', {
          onChange: handleMemoTextAreaChange,
        })}
        ref={textareaRef}
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
              onKeyDown={e => {
                if (e.key === 'Escape') {
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
        {selectedCategory && (
          <Badge variant="outline" className="flex items-center gap-1 px-2 py-0.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedCategory.color || '#888888' }} />
            {selectedCategory.name}
            <XIcon size={12} className="hover:text-destructive ml-1 cursor-pointer" onClick={handleRemoveCategory} />
          </Badge>
        )}
      </div>
    </form>
  );
}

export default withAuthentication(MemoForm);
