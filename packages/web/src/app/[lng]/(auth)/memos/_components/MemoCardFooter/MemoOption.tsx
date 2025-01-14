import { QUERY_KEY } from '@extension/shared/constants';
import {
  useCategoryQuery,
  useDeleteMemosMutation,
  useMemosQuery,
  useMemosUpsertMutation,
} from '@extension/shared/hooks';
import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { isAllSame } from '@extension/shared/utils';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  ToastAction,
} from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useQueryClient } from '@tanstack/react-query';
import { EllipsisVerticalIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MouseEvent, useState } from 'react';

interface MemoOptionProps extends LanguageType {
  memoIds: number[];
  closeMemoOption?: () => void;
}

export default function MemoOption({ lng, memoIds = [], closeMemoOption }: MemoOptionProps) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { categories } = useCategoryQuery();
  const queryClient = useQueryClient();
  const { mutate: mutateUpsertMemo } = useMemosUpsertMutation();
  const { mutate: mutateDeleteMemo } = useDeleteMemosMutation();

  const { memos } = useMemosQuery({ isWish: searchParams.get('isWish') === 'true' });
  const selectedMemos = memos.filter(memo => memoIds.includes(memo.id));

  const defaultCategoryId = isAllSame(selectedMemos.map(memo => memo.category_id))
    ? String(selectedMemos.at(0)?.category_id)
    : '';

  const handleDeleteMemo = (event?: MouseEvent<HTMLDivElement>) => {
    event?.stopPropagation();

    mutateDeleteMemo(
      selectedMemos.map(memo => memo.id),
      {
        onSuccess: async () => {
          const handleToastActionClick = () => {
            mutateUpsertMemo(selectedMemos, {
              onSuccess: async () => {
                await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
                await ExtensionBridge.requestRefetchTheMemos();
              },
            });
          };

          toast({
            title: t('toastTitle.memoDeleted'),
            action: (
              <ToastAction altText={t('toastActionMessage.undo')} onClick={handleToastActionClick}>
                {t('toastActionMessage.undo')}
              </ToastAction>
            ),
          });

          await ExtensionBridge.requestRefetchTheMemos();
        },
        onSettled: () => {
          setIsOpen(false);
          closeMemoOption?.();
        },
      },
    );
  };

  const handleCategoryChange = (categoryId: string) => {
    const currentMemo = memos.filter(memo => memoIds.includes(memo.id));
    mutateUpsertMemo(
      currentMemo.map(memo => ({ ...memo, category_id: Number(categoryId) })),
      {
        onSuccess: () => {
          const category = categories?.find(category => category.id === Number(categoryId));
          if (!category) return;

          toast({
            title: t('toastTitle.categoryEdited'),
            action: (
              <ToastAction
                altText={t('toastActionMessage.goTo')}
                onClick={() => {
                  searchParams.set('category', category.name);

                  router.push(searchParams.getUrl());
                }}>
                {t('toastActionMessage.goTo')}
              </ToastAction>
            ),
          });
          queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
        },
        onSettled: () => {
          setIsOpen(false);
        },
      },
    );
  };

  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen} modal={false}>
      <DropdownMenuTrigger asChild onMouseDown={e => e.stopPropagation()}>
        <Button variant="ghost" size="icon">
          <EllipsisVerticalIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={handleDeleteMemo}
            className="cursor-pointer"
            onMouseDown={e => e.stopPropagation()}>
            {t('option.deleteMemo')}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Select onValueChange={handleCategoryChange} defaultValue={defaultCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t('option.changeCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories?.map(category => (
                    <SelectItem
                      key={category.id}
                      value={String(category.id)}
                      id={String(category.id)}
                      className="cursor-pointer"
                      onMouseDown={e => e.stopPropagation()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
