import { HTMLAttributes } from 'react';

import { MemoRow } from '@extension/shared/types';
import { Badge } from '@src/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@src/components/ui/card';
import { cn } from '@src/utils';
import Image from 'next/image';
import MemoOption from './MemoOption';

interface MemoItemProps extends HTMLAttributes<HTMLDivElement> {
  isHovered: boolean;
  memo?: MemoRow & { category: { name: string } };
}

export default function MemoItem({ isHovered, memo, ...props }: MemoItemProps) {
  if (!memo) return null;

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
          <span className="line-clamp-1">{memo.title}</span>
        </p>
      </CardHeader>
      {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
      <CardFooter className={cn('flex justify-between p-0 px-4 pb-2')}>
        {memo?.category?.name ? <Badge variant="outline">{memo?.category?.name}</Badge> : <span />}
        <div
          className={cn('transition', {
            'opacity-0': !isHovered,
            'opacity-100': isHovered,
          })}>
          <MemoOption id={memo.id} />
        </div>
      </CardFooter>
    </Card>
  );
}
