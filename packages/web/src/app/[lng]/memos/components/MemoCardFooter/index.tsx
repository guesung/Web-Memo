'use client';

import { useMemoPatchMutation } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { GetMemoResponse } from '@extension/shared/types';
import { cn } from '@extension/shared/utils';
import { Badge, Button, CardFooter, toast, ToastAction } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import dayjs from 'dayjs';
import { HeartIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MouseEvent, PropsWithChildren } from 'react';
import MemoOption from './MemoOption';

import relativeTime from 'dayjs/plugin/relativeTime';

import 'dayjs/locale/ko';
import 'dayjs/locale/en';

interface MemoCardFooterProps extends LanguageType, React.HTMLAttributes<HTMLDivElement>, PropsWithChildren {
  memo: GetMemoResponse;
  isOptionShown: boolean;
}

export default function MemoCardFooter({ memo, lng, isOptionShown, children, ...props }: MemoCardFooterProps) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mutate: mutateMemoPatch } = useMemoPatchMutation();

  dayjs.extend(relativeTime);
  dayjs.locale(lng === 'ko' ? 'ko' : 'en');

  const handleCategoryClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!memo.category?.name) return;

    searchParams.set('category', memo.category?.name);
    router.push(searchParams.getUrl(), { scroll: false });
  };

  const handleIsWishClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    mutateMemoPatch(
      {
        id: memo.id,
        request: {
          isWish: !memo.isWish,
        },
      },
      {
        onSuccess: () => {
          const toastTitle = memo.isWish ? t('toastTitle.memoWishListDeleted') : t('toastTitle.memoWishListAdded');

          toast({
            title: toastTitle,
            action: (
              <ToastAction
                altText={t('toastActionMessage.undo')}
                onClick={() => {
                  mutateMemoPatch({
                    id: memo.id,
                    request: {
                      isWish: memo.isWish,
                    },
                  });
                }}>
                {t('toastActionMessage.undo')}
              </ToastAction>
            ),
          });
        },
      },
    );
  };

  return (
    <CardFooter className={cn('flex h-[40px] justify-between p-0 px-4 pb-2 pt-0', props.className)} {...props}>
      <div className="flex">
        {memo.category?.name ? (
          <Badge variant="outline" onClick={handleCategoryClick} role="button" className="z-10">
            {memo.category?.name}
          </Badge>
        ) : (
          <span />
        )}
      </div>
      <div
        className={cn('relative z-50 flex items-center transition', {
          'opacity-0': !isOptionShown,
          'opacity-100': isOptionShown,
        })}>
        <Button variant="ghost" size="icon" onClick={handleIsWishClick} onMouseDown={e => e.stopPropagation()}>
          <HeartIcon
            size={12}
            fill={memo.isWish ? 'pink' : ''}
            fillOpacity={memo.isWish ? 100 : 0}
            className={cn('transition-transform hover:scale-110 active:scale-95', {
              'animate-heart-pop': memo.isWish,
            })}
          />
        </Button>
        <MemoOption memos={[memo]} lng={lng} />
        {children}
      </div>
      <time
        dateTime={memo.created_at}
        className={cn('text-muted-foreground absolute right-4 text-xs', {
          'opacity-0': isOptionShown,
        })}>
        {dayjs(memo.created_at).fromNow()}
      </time>
    </CardFooter>
  );
}
