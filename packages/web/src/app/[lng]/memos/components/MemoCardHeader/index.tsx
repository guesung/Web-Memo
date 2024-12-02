import { GetMemoResponse } from '@extension/shared/utils';
import { CardHeader } from '@src/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui/tooltip';
import Image from 'next/image';
import Link from 'next/link';

interface MemoCardHeaderProps {
  memo: GetMemoResponse;
  tooltip?: boolean;
}

export default function MemoCardHeader({ memo }: MemoCardHeaderProps) {
  return (
    <CardHeader className="py-4 font-normal">
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
