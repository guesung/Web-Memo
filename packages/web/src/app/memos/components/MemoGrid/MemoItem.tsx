import { requestRefetchTheMemoList } from '@extension/shared/utils/extension';

import { HTMLAttributes } from 'react';

import { MemoRow } from '@extension/shared/types';
import { Card, CardContent, CardFooter, CardHeader } from '@src/components/ui/card';
import { useMemoDeleteMutation } from '@src/hooks';
import { cn } from '@src/utils';
import Image from 'next/image';
import MemoOption from './MemoOption';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { useCategoryQuery } from '@extension/shared/hooks';

interface MemoItemProps extends HTMLAttributes<HTMLDivElement> {
  isHovered: boolean;
  memo?: MemoRow;
}

export default function MemoItem({ isHovered, memo, ...props }: MemoItemProps) {
  if (!memo) return null;

  return (
    <Card className="relative box-border w-[300px]" id={String(memo.id)} {...props}>
      <CardHeader>
        <p className="flex gap-2">
          {memo?.favIconUrl ? (
            <Image
              src={memo.favIconUrl}
              width={12}
              height={12}
              alt="favicon"
              className="float-left"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <></>
          )}
          <span className="line-clamp-1">{memo.title}</span>
        </p>
      </CardHeader>
      {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
      <CardFooter
        className={cn('flex justify-end p-0 pb-2 transition', {
          'opacity-0': !isHovered,
          'opacity-100': isHovered,
        })}>
        <MemoOption id={memo.id} />
      </CardFooter>
    </Card>
  );
}
