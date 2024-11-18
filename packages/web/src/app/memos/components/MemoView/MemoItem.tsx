import { HTMLAttributes, MouseEventHandler, useState } from 'react';

import { useMemoPatchMutation, useSearchParamsRouter } from '@extension/shared/hooks';
import { GetMemoType } from '@extension/shared/utils';
import { Badge } from '@src/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@src/components/ui/card';
import { useToast } from '@src/hooks/use-toast';
import { cn } from '@src/utils';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { HeartIcon } from 'lucide-react';
import Image from 'next/image';
import MemoOption from './MemoOption';

interface MemoItemProps extends HTMLAttributes<HTMLDivElement> {
  memo?: GetMemoType;
}

export default function MemoItem({ memo, ...props }: MemoItemProps) {
  if (!memo) return null;

  const [isHovered, setIsHovered] = useState(false);
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient: getSupabaseClient(),
  });
  const { set: setIdSearchParamsRouter } = useSearchParamsRouter('id');
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

  const handleClick: MouseEventHandler<HTMLDivElement> = event => {
    const id = event.currentTarget.id;
    setIdSearchParamsRouter(id);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <Card
      className="relative box-border w-[300px]"
      id={String(memo.id)}
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}>
      <CardHeader className="py-4">
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
      <CardFooter className={cn('flex justify-between p-0 px-4 pb-2 pt-0')}>
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
