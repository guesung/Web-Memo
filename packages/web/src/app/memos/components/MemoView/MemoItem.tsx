import { HTMLAttributes, memo, MouseEventHandler, useState } from 'react';

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui/tooltip';
import Link from 'next/link';

interface MemoItemProps extends HTMLAttributes<HTMLDivElement> {
  memo?: GetMemoType;
}

export default memo(function MemoItem({ memo, ...props }: MemoItemProps) {
  if (!memo) return null;

  const [isHovered, setIsHovered] = useState(false);
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient: getSupabaseClient(),
  });
  const { set: setIdSearchParamsRouter } = useSearchParamsRouter('id');
  const { toast } = useToast();

  const handleIsWishClick: MouseEventHandler<SVGSVGElement> = event => {
    mutateMemoPatch(
      {
        id: memo.id,
        memoRequest: {
          isWish: !memo.isWish,
        },
      },
      {
        onSuccess: () => {
          if (memo.isWish) toast({ title: '메모가 위시리스트에서 제거되었습니다.' });
          else toast({ title: '메모가 위시리스트에 추가되었습니다.' });
        },
      },
    );
  };

  const handleContentClick: MouseEventHandler<HTMLDivElement> = event => {
    const id = event.currentTarget.id;
    setIdSearchParamsRouter(id);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <Card
      className="relative box-border w-[300px]"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}>
      <CardHeader className="py-4">
        <Link className="flex gap-2" href={memo.url} target="_blank">
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
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger>
                <span className="line-clamp-1 font-bold">{memo.title}</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{memo.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Link>
      </CardHeader>
      {memo.memo && (
        <CardContent
          className="whitespace-break-spaces break-all"
          onClick={handleContentClick}
          id={String(memo.id)}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && handleContentClick(e as any)}>
          {memo.memo}
        </CardContent>
      )}
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
            onClick={handleIsWishClick}
            className="cursor-pointer"
          />
          <MemoOption id={memo.id} />
        </div>
      </CardFooter>
    </Card>
  );
});
