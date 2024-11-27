import { QUERY_KEY } from '@extension/shared/constants';
import { useCategoryQuery, useMemoPatchMutation, useMemoPostMutation, useMemoQuery } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
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
import { useMemoDeleteMutation, useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useQueryClient } from '@tanstack/react-query';
import { EllipsisVerticalIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MouseEventHandler } from 'react';

interface MemoOptionProps extends LanguageType {
  memoId: number;
}

export default function MemoOption({ lng, memoId }: MemoOptionProps) {
  const { t } = useTranslation(lng);
  const supabaseClient = useSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { categories } = useCategoryQuery({ supabaseClient });
  const queryClient = useQueryClient();

  const { memo: memoData } = useMemoQuery({ supabaseClient, id: memoId });
  const { mutate: mutatePatchMemo } = useMemoPatchMutation({
    supabaseClient,
  });
  const { mutate: mutatePostMemo } = useMemoPostMutation({
    supabaseClient,
  });
  const { mutate: mutateDeleteMemo } = useMemoDeleteMutation();

  const handleDeleteMemo: MouseEventHandler<HTMLDivElement> = event => {
    event.stopPropagation();
    mutateDeleteMemo(memoId, {
      onSuccess: ({ data }) => {
        if (!data) return;

        const deletedMemo = data[0];
        const handlePostMemo = () => mutatePostMemo(deletedMemo);

        toast({
          title: t('toastMessage.memoDeleted'),
          action: (
            <ToastAction altText={t('toastActionMessage.memoDeleteCancel')} onClick={handlePostMemo}>
              {t('toastActionMessage.memoDeleteCancel')}
            </ToastAction>
          ),
        });
        requestRefetchTheMemos();
      },
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    mutatePatchMemo(
      { id: memoId, memoRequest: { category_id: Number(categoryId) } },
      {
        onSuccess: () => {
          const category = categories?.find(category => category.id === Number(categoryId));
          if (!category) return;

          toast({
            title: t('toastMessage.categoryEdited'),
            action: (
              <ToastAction
                altText={t('toastActionMessage.goTo')}
                onClick={() => {
                  searchParams.set('category', category.name);
                  searchParams.set('id', memoId.toString());

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
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="link" size="sm">
          <EllipsisVerticalIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem role="button" onClick={handleDeleteMemo}>
            {t('option.deleteMemo')}
          </DropdownMenuItem>
          <DropdownMenuItem role="button">
            <Select onValueChange={handleCategoryChange} defaultValue={String(memoData?.category_id)}>
              <SelectTrigger>
                <SelectValue placeholder={t('option.changeCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories?.map(category => (
                    <SelectItem key={category.id} value={String(category.id)} id={String(category.id)}>
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
