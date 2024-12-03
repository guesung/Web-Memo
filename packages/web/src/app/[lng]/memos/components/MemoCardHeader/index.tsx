import { cn, GetMemoResponse } from '@extension/shared/utils';
import { Button } from '@src/components/ui/button';
import { CardHeader } from '@src/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui/tooltip';
import { CheckIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { KeyboardEvent, MouseEvent } from 'react';

interface MemoCardHeaderProps {
  memo: GetMemoResponse;
  tooltip?: boolean;
  isHovered?: boolean;
  isSelected?: boolean;
  onSelect: (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
}

export default function MemoCardHeader({ memo, isHovered, isSelected, onSelect }: MemoCardHeaderProps) {
  return (
    <CardHeader className="relative py-4 font-normal">
      <Button
        id={String(memo.id)}
        variant="ghost"
        size="icon"
        className={cn('absolute -left-4 -top-4 z-10 rounded-full bg-white', {
          'opacity-100': isHovered || isSelected,
          'opacity-0': !isHovered && !isSelected,
        })}
        onClick={onSelect}>
        <CheckIcon size={12} />
      </Button>
      <Link href={memo.url} target="_blank" className="flex gap-2" onClick={e => e.stopPropagation()}>
        {memo?.favIconUrl && (
          <Image
            src={memo.favIconUrl}
            width={12}
            height={12}
            alt="favicon"
            className="float-left"
            style={{ objectFit: 'contain', height: 'auto' }}
          />
        )}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="line-clamp-1 font-bold">{memo.title}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{memo.title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Link>
    </CardHeader>
  );
}
