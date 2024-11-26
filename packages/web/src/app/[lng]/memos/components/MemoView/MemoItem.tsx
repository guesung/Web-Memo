import { HTMLAttributes, KeyboardEvent, memo, MouseEvent, MouseEventHandler, useState } from 'react';

import { useMemoPatchMutation } from '@extension/shared/hooks';
import { GetMemoResponse } from '@extension/shared/utils';
import useTranslation from '@src/modules/i18n/client';
import { LanguageType } from '@src/modules/i18n';
import { Badge } from '@src/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@src/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@src/components/ui/tooltip';
import { useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { cn } from '@src/utils';
import { HeartIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MemoOption from './MemoOption';
import { useSearchParams } from '@extension/shared/modules/search-params';

interface MemoItemProps extends HTMLAttributes<HTMLDivElement>, LanguageType {
  memo?: GetMemoResponse;
}

export default memo(function MemoItem({ lng, memo, ...props }: MemoItemProps) {
  if (!memo) return null;

  const { t } = useTranslation(lng);
  const supabaseClient = useSupabaseClient();

  const [isHovered, setIsHovered] = useState(false);
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
  });
  const searchParams = useSearchParams();
  const router = useRouter();
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
          if (memo.isWish) toast({ title: t('toastMessage.memoWishListDeleted') });
          else toast({ title: t('toastMessage.memoWishListAdded') });
        },
      },
    );
  };

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
          <MemoOption memoId={memo.id} lng={lng} />
        </div>
      </CardFooter>
    </Card>
  );
});
