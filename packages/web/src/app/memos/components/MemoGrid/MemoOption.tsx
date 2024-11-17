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
import { requestRefetchTheMemoList } from '@extension/shared/utils/extension';

interface MemoOptionProps {
  id: number;
}

export default function MemoOption({ id }: MemoOptionProps) {
  const supabaseClient = getSupabaseClient();
  const { data: categoryData } = useCategoryQuery({ supabaseClient });
  const categories = categoryData?.data;
  const { data: memoData } = useMemoQuery({ supabaseClient, id });
  const { mutate: mutatePatchMemo } = useMemoPatchMutation({
    supabaseClient,
  });

  const { mutate: mutateDeleteMemo } = useMemoDeleteMutation({
    handleSuccess: requestRefetchTheMemoList,
  });

  const onDeleteMemo = () => {
    mutateDeleteMemo(id);
  };

  const handleCategoryChange = (categoryId: string) => {
    mutatePatchMemo({ id, category_id: categoryId });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="link" size="sm">
          <Image src="/images/svgs/option_vertical.svg" width={16} height={16} alt="option" className="rounded-full" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={onDeleteMemo}>
            삭제
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Select
              onValueChange={handleCategoryChange}
              defaultValue={String(memoData?.category_id) ?? categories?.[0]}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 변경" />
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
