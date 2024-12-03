import { QUERY_KEY } from '@extension/shared/constants';
import { useCategoryQuery, useMemoPostMutation, useMemoQuery, useMemosUpsertMutation } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { MemoRow } from '@extension/shared/types';
import { requestRefetchTheMemos } from '@extension/shared/utils/extension';
import { Button } from '@src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@src/components/ui/dropdown-menu';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui/select';
import { ToastAction } from '@src/components/ui/toast';
import { useDeleteMemosMutation, useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useQueryClient } from '@tanstack/react-query';
import { EllipsisVerticalIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MouseEventHandler, useState } from 'react';

interface MemoOptionProps extends LanguageType {
  memos: MemoRow[];
}

export default function MemoOption({ lng, memos }: MemoOptionProps) {
  const { t } = useTranslation(lng);
  const supabaseClient = useSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { categories } = useCategoryQuery({ supabaseClient });
  const queryClient = useQueryClient();

  const { memo: memoData } = useMemoQuery({ supabaseClient, id: memos.at(0)?.id });
  const { mutate: mutateUpsertMemo } = useMemosUpsertMutation({
    supabaseClient,
  });
  const { mutate: mutatePostMemo } = useMemoPostMutation({
    supabaseClient,
  });
  const { mutate: mutateDeleteMemo } = useDeleteMemosMutation();

  const [isOpen, setIsOpen] = useState(false);

  const handleDeleteMemo: MouseEventHandler<HTMLDivElement> = event => {
    event.stopPropagation();

    mutateDeleteMemo(
      memos.map(memo => memo.id),
      {
        onSuccess: ({ data }) => {
          if (!data) return;

          const deletedMemo = data[0];
          const handlePostMemo = () => mutatePostMemo(deletedMemo);

          toast({
            title: t('toastTitle.memoDeleted'),
            action: (
              <ToastAction altText={t('toastActionMessage.undo')} onClick={handlePostMemo}>
                {t('toastActionMessage.undo')}
              </ToastAction>
            ),
          });
          requestRefetchTheMemos();
        },
      },
    );
  };

  const handleCategoryChange = (categoryId: string) => {
    mutateUpsertMemo(
      { memoRequest: memos.map(memo => ({ ...memo, category_id: Number(categoryId) })) },
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
                  searchParams.set('id', memos[0].id.toString());

                  router.push(searchParams.getUrl());
                }}>
                {t('toastActionMessage.goTo')}
              </ToastAction>
            ),
          });
          queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
        },
      },
    );

    setIsOpen(false);
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
            <Select onValueChange={handleCategoryChange} defaultValue={String(memoData?.category_id)}>
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
