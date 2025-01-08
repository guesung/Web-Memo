import { GetMemoResponse } from '@extension/shared/types';
import { cn } from '@extension/shared/utils';
import { Button, CardHeader, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui';
import { CheckIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback } from 'react';

interface MemoCardHeaderProps {
  memo: GetMemoResponse;
  selectMemoItem?: (id: number) => void;
  isHovered?: boolean;
  isSelected?: boolean;
}

export default memo(function MemoCardHeader({ memo, selectMemoItem, isHovered, isSelected }: MemoCardHeaderProps) {
  const handleMemoSelect = useCallback(() => {
    selectMemoItem?.(memo.id);
  }, []);

  const isShowingSelectButton = isHovered || isSelected;
  return (
    <CardHeader className="relative py-4 font-normal">
      <Button
        variant="outline"
        size="sm"
        className={cn('absolute -left-4 -top-4 z-10 rounded-full px-2', {
          'opacity-100': isShowingSelectButton,
          'opacity-0': !isShowingSelectButton,
        })}
        onClick={handleMemoSelect}
        onMouseDown={e => e.stopPropagation()}>
        <CheckIcon size={8} />
      </Button>
      <Link href={memo.url} target="_blank" className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
        {memo?.favIconUrl && (
          <Image
            src={memo.favIconUrl}
            width={12}
            height={12}
            alt="favicon"
            className="h-3 w-3 object-contain"
            priority
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
});
