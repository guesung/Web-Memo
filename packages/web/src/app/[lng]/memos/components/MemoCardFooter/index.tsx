import { useMemoPatchMutation } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { GetMemoResponse } from '@extension/shared/utils';
import { Badge } from '@src/components/ui/badge';
import { CardFooter } from '@src/components/ui/card';
import { ToastAction } from '@src/components/ui/toast';
import { useSupabaseClient } from '@src/hooks';
import { useToast } from '@src/hooks/use-toast';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { cn } from '@src/utils';
import { HeartIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MouseEventHandler } from 'react';

import MemoOption from '../MemoView/MemoOption';

interface MemoCardFooterProps extends LanguageType {
  memo: GetMemoResponse;
  isHovered: boolean;
}
export default function MemoCardFooter({ memo, lng, isHovered }: MemoCardFooterProps) {
  const { t } = useTranslation(lng);
  const supabaseClient = useSupabaseClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mutate: mutateMemoPatch } = useMemoPatchMutation({
    supabaseClient,
  });
  const { toast } = useToast();

  const handleCategoryClick = () => {
    if (!memo.category?.name) return;

    searchParams.set('category', memo.category?.name);
    router.replace(searchParams.getUrl(), { scroll: false });
  };

  const handleIsWishClick: MouseEventHandler<SVGSVGElement> = () => {
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
    <CardFooter className={cn('flex justify-between p-0 px-4 pb-2 pt-0')}>
      <div>
        {memo.category?.name ? (
          <Badge variant="outline" onClick={handleCategoryClick} className="cursor-pointer">
            {memo.category?.name}
          </Badge>
        ) : (
          <span />
        )}
      </div>
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
          className={cn('cursor-pointer transition-transform hover:scale-110', 'active:scale-95', {
            'animate-heart-pop': memo.isWish,
          })}
        />
        <MemoOption memoId={memo.id} lng={lng} />
      </div>
    </CardFooter>
  );
}
