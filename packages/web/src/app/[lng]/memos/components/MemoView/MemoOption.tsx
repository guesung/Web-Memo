import { Button } from '@src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@src/components/ui/dropdown-menu';

import { QUERY_KEY } from '@extension/shared/constants';
import { useCategoryQuery, useMemoPatchMutation, useMemoPostMutation } from '@extension/shared/hooks';
import { requestRefetchTheMemos } from '@extension/shared/utils/extension';
import useTranslation from '@src/app/i18n/client';
import { LanguageType } from '@src/app/i18n/type';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui/select';
import { ToastAction } from '@src/components/ui/toast';
import { PATHS } from '@src/constants';
import { useMemoDeleteMutation } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { useQueryClient } from '@tanstack/react-query';
import { EllipsisVerticalIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MouseEventHandler } from 'react';

interface MemoOptionProps extends LanguageType {
  memoId: number;
}

export default function MemoOption({ lng, memoId }: MemoOptionProps) {
  const { t } = useTranslation(lng);

  const supabaseClient = getSupabaseClient();
  const { toast } = useToast();
  const { categories } = useCategoryQuery({ supabaseClient });
  const queryClient = useQueryClient();
  const { mutate: mutatePatchMemo } = useMemoPatchMutation({
    supabaseClient,
  });

  const router = useRouter();

  const { mutate: mutateDeleteMemo } = useMemoDeleteMutation({
    handleSuccess: requestRefetchTheMemos,
  });
  const { mutate: mutatePostMemo } = useMemoPostMutation({
    supabaseClient,
  });

  const handleDeleteMemo: MouseEventHandler<HTMLDivElement> = event => {
    event.stopPropagation();
    mutateDeleteMemo(memoId, {
      onSuccess: ({ data }) => {
        if (!data) return;

        const saveMemo = () => mutatePostMemo(data[0]);

        toast({
          title: t('toastMessage.memoDeleted'),
          action: (
            <ToastAction altText={t('toastActionMessage.memoDeleteCancel')} onClick={saveMemo}>
              {t('toastActionMessage.memoDeleteCancel')}
            </ToastAction>
          ),
        });
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
                  router.push(`${PATHS.memos}?category=${category.name}&memoId=${memoId}`);
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
          <DropdownMenuItem className="cursor-pointer" onClick={handleDeleteMemo}>
            {t('option.deleteMemo')}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Select onValueChange={handleCategoryChange} defaultValue="">
              <SelectTrigger>
                <SelectValue placeholder={t('option.changeCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories &&
                    categories.map(category => (
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
