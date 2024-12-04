import { QUERY_KEY } from '@extension/shared/constants';
import { useCategoryQuery, useDeleteMemosMutation, useMemosUpsertMutation } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { MemoRow } from '@extension/shared/types';
import { isAllSame } from '@extension/shared/utils';
import { requestRefetchTheMemos } from '@extension/shared/utils/extension';
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
  ToastAction,
  useToast,
} from '@src/components/ui';
import { useSupabaseClient } from '@src/hooks';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useQueryClient } from '@tanstack/react-query';
import { EllipsisVerticalIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MouseEvent, useState } from 'react';

interface MemoOptionProps extends LanguageType {
  memos: MemoRow[];
  closeMemoOption?: () => void;
}

export default function MemoOption({ lng, memos, closeMemoOption }: MemoOptionProps) {
  const { t } = useTranslation(lng);
  const supabaseClient = useSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { categories } = useCategoryQuery({ supabaseClient });
  const queryClient = useQueryClient();
  const { mutate: mutateUpsertMemo } = useMemosUpsertMutation({
    supabaseClient,
  });
  const { mutate: mutateDeleteMemo } = useDeleteMemosMutation({ supabaseClient });

  const defaultCategoryId = isAllSame(memos.map(memo => memo.category_id)) ? String(memos.at(0)?.category_id) : '';

  const handleDeleteMemo = (event?: MouseEvent<HTMLDivElement>) => {
    event?.stopPropagation();

    mutateDeleteMemo(
      memos.map(memo => memo.id),
      {
        onSuccess: () => {
          const handleToastActionClick = () => {
            mutateUpsertMemo(memos, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
                requestRefetchTheMemos();
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
        },
        onSettled: () => {
          setIsOpen(false);
          closeMemoOption?.();
        },
      },
    );
  };

  const handleCategoryChange = (categoryId: string) => {
    mutateUpsertMemo(
      memos.map(memo => ({ ...memo, category_id: Number(categoryId) })),
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
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
          <EllipsisVerticalIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleDeleteMemo} className="cursor-pointer">
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
                      className="cursor-pointer">
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
