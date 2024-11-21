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
import { useCategoryQuery, useMemoPatchMutation, useMemoQuery } from '@extension/shared/hooks';
import { useMemoDeleteMutation } from '@src/hooks';
import { requestRefetchTheMemos } from '@extension/shared/utils/extension';
import { useToast } from '@src/hooks/use-toast';
import { MouseEventHandler } from 'react';
import { EllipsisVerticalIcon } from 'lucide-react';
import { LanguageType } from '@src/app/i18n/type';
import useTranslation from '@src/app/i18n/client';

interface MemoOptionProps extends LanguageType {
  id: number;
}

export default function MemoOption({ lng, id }: MemoOptionProps) {
  const { t } = useTranslation(lng);

  const supabaseClient = getSupabaseClient();
  const { toast } = useToast();
  const { categories } = useCategoryQuery({ supabaseClient });
  const { data: memoData, refetch: refetchMemo } = useMemoQuery({ supabaseClient, id });
  const { mutate: mutatePatchMemo } = useMemoPatchMutation({
    supabaseClient,
  });

  const { mutate: mutateDeleteMemo } = useMemoDeleteMutation({
    handleSuccess: requestRefetchTheMemos,
  });

  const handleDeleteMemo: MouseEventHandler<HTMLDivElement> = event => {
    event.stopPropagation();
    mutateDeleteMemo(id);
    toast({ title: t('toastMessage.memoDeleted') });
  };

  const handleCategoryChange = (categoryId: string) => {
    mutatePatchMemo(
      { id, memoRequest: { category_id: Number(categoryId) } },
      {
        onSuccess: () => {
          toast({ title: t('toastMessage.memoEdited') });
          refetchMemo();
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
            <Select onValueChange={handleCategoryChange} defaultValue={String(memoData?.category_id)}>
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
