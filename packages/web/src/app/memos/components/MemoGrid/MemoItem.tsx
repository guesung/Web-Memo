import { HTMLAttributes, MouseEventHandler } from 'react';

import { MemoRow } from '@extension/shared/types';
import { Badge } from '@src/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@src/components/ui/card';
import { cn } from '@src/utils';
import Image from 'next/image';
import MemoOption from './MemoOption';
import { HeartIcon } from 'lucide-react';
import { useMemoPatchMutation } from '@extension/shared/hooks';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { useToast } from '@src/hooks/use-toast';

interface MemoItemProps extends HTMLAttributes<HTMLDivElement> {
  isHovered: boolean;
  memo?: MemoRow & { category: { name: string } };
}

export default function MemoItem({ isHovered, memo, ...props }: MemoItemProps) {
  if (!memo) return null;

  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient: getSupabaseClient(),
  });
  const { toast } = useToast();

  const handleMemoIsWishClick: MouseEventHandler<SVGSVGElement> = event => {
    event.stopPropagation();
    mutateMemoPatch(
      {
        id: memo.id,
        isWish: !memo.isWish,
      },
      {
        onSuccess: () => {
          if (memo.isWish) toast({ title: '메모가 위시리스트에서 제거되었습니다.' });
          else toast({ title: '메모가 위시리스트에 추가되었습니다.' });
        },
      },
    );
  };

  return (
    <Card className="relative box-border w-[300px]" id={String(memo.id)} {...props}>
      <CardHeader>
        <p className="flex gap-2">
          {memo?.favIconUrl && (
            <Image
              src={memo.favIconUrl}
              width={12}
              height={12}
              alt="favicon"
              className="float-left"
              style={{ objectFit: 'contain' }}
            />
          )}
          <span className="line-clamp-1 font-bold">{memo.title}</span>
        </p>
      </CardHeader>
      {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
      <CardFooter className={cn('flex justify-between p-0 px-4 pb-2')}>
        <div>{memo?.category?.name ? <Badge variant="outline">{memo?.category?.name}</Badge> : <span />}</div>
        <div
          className={cn('flex items-center gap-2 transition', {
            'opacity-0': !isHovered,
            'opacity-100': isHovered,
          })}>
          <HeartIcon
            size={12}
            fill={memo.isWish ? 'pink' : ''}
            fillOpacity={memo.isWish ? 100 : 0}
            onClick={handleMemoIsWishClick}
            className="cursor-pointer"
          />
          <MemoOption id={memo.id} />
        </div>
      </CardFooter>
    </Card>
  );
}
