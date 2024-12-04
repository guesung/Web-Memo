import { useMemoPatchMutation } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { GetMemoResponse } from '@extension/shared/utils';
import { Badge } from '@src/components/ui';
import { Button } from '@src/components/ui';
import { CardFooter } from '@src/components/ui';
import { ToastAction } from '@src/components/ui';
import { useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { cn } from '@src/utils';
import { HeartIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MouseEvent, PropsWithChildren } from 'react';

import MemoOption from './MemoOption';

interface MemoCardFooterProps extends LanguageType, React.HTMLAttributes<HTMLDivElement>, PropsWithChildren {
  memo: GetMemoResponse;
  isOptionShown: boolean;
}
export default function MemoCardFooter({ memo, lng, isOptionShown, children, ...props }: MemoCardFooterProps) {
  const { t } = useTranslation(lng);
  const { toast } = useToast();
  const supabaseClient = useSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
  });

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
        memoRequest: {
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
                    memoRequest: {
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
    <CardFooter className={cn('flex justify-between p-0 px-4 pb-2 pt-0', props.className)} {...props}>
      <div>
        {memo.category?.name ? (
          <Badge variant="outline" onClick={handleCategoryClick} role="button" className="z-10">
            {memo.category?.name}
          </Badge>
        ) : (
          <span />
        )}
      </div>
      <div
        className={cn('flex items-center transition', {
          'opacity-0': !isOptionShown,
        })}>
        <Button variant="ghost" size="icon" onClick={handleIsWishClick}>
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
    </CardFooter>
  );
}
