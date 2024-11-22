import { Button } from '@src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@src/components/ui/dropdown-menu';
import Image from 'next/image';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@src/components/ui/select';
import { CategoryRow } from '@extension/shared/types';
import { getSupabaseClient } from '@src/utils/supabase.client';
import {
  useCategoryQuery,
  useMemoPatchMutation,
  useMemoPostMutation,
  useMemoQuery,
  useSearchParamsRouter,
} from '@extension/shared/hooks';
import { useMemoDeleteMutation } from '@src/hooks';
import { requestRefetchTheMemos } from '@extension/shared/utils/extension';
import { useToast } from '@src/hooks/use-toast';
import { MouseEventHandler } from 'react';
import { EllipsisVerticalIcon } from 'lucide-react';
import { LanguageType } from '@src/app/i18n/type';
import useTranslation from '@src/app/i18n/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { PATHS } from '@src/constants';
import { ToastAction } from '@src/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@extension/shared/constants';

interface MemoOptionProps extends LanguageType {
  id: number;
}

export default function MemoOption({ lng, id }: MemoOptionProps) {
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
    mutateDeleteMemo(id, {
      onSuccess: ({ data }) => {
        if (!data) return;

        const saveMemo = () => mutatePostMemo(data[0]);

        toast({
          title: t('toastMessage.memoDeleted'),
          action: (
            <ToastAction altText="제거 취소" onClick={saveMemo}>
              제거 취소
            </ToastAction>
          ),
        });
      },
    });
  };

  const handleCategoryChange = (categoryId: string) => {
    mutatePatchMemo(
      { id, memoRequest: { category_id: Number(categoryId) } },
      {
        onSuccess: () => {
          const category = categories?.find(category => category.id === Number(categoryId));
          if (!category) return;

          toast({
            title: t('toastMessage.memoEdited'),
            action: (
              <ToastAction
                altText="바로가기"
                onClick={() => {
                  router.push(`${PATHS.memos}?category=${category.name}&id=${id}`);
                }}>
                바로가기
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
