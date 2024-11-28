import { useSearchParams } from '@extension/shared/modules/search-params';
import { GetMemoResponse } from '@extension/shared/utils';
import { Card, CardContent, CardHeader } from '@src/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui/tooltip';
import { LanguageType } from '@src/modules/i18n';
import { HTMLMotionProps, motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyboardEvent, memo, MouseEvent, useState } from 'react';

import MemoCardFooter from '../MemoCardFooter';

interface MemoItemProps extends HTMLMotionProps<'article'>, LanguageType {
  memo?: GetMemoResponse;
}

export default memo(function MemoItem({ lng, memo, ...props }: MemoItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  if (!memo) return null;

  const handleContentClick = (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
    const id = event.currentTarget.id;
    if (!id) return;

    searchParams.set('id', id);
    router.replace(searchParams.getUrl(), { scroll: false });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="transition-all"
      {...props}>
      <Card className="relative box-border w-[300px]" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <CardHeader className="py-4">
          <Link className="flex gap-2" href={memo.url} target="_blank">
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
            onKeyDown={e => e.key === 'Enter' && handleContentClick(e)}>
            {memo.memo}
          </CardContent>
        )}
        <MemoCardFooter memo={memo} lng={lng} isHovered={isHovered} />
      </Card>
    </motion.article>
  );
});
