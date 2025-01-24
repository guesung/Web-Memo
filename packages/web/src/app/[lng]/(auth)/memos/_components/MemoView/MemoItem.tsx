import { GetMemoResponse } from '@extension/shared/types';
import { cn } from '@extension/shared/utils';
import { Card, CardContent } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import { HTMLAttributes, memo, MouseEvent, useState } from 'react';
import { motion } from 'framer-motion';

import { useSearchParams } from '@extension/shared/modules/search-params';
import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';
import { useRouter } from 'next/navigation';

interface MemoItemProps extends HTMLAttributes<HTMLElement>, LanguageType {
  memo: GetMemoResponse;
  isSelecting: boolean;
  selectMemoItem: (id: number) => void;
  isSelected: boolean;
  setDialogMemoId: (id: number) => void;
}

export default memo(
  function MemoItem({ lng, memo, selectMemoItem, isSelecting, isSelected, setDialogMemoId, ...props }: MemoItemProps) {
    const searchParams = useSearchParams();
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = () => {
      setIsHovered(true);
    };
    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    const handleMemoItemClick = (event: MouseEvent<HTMLElement>) => {
      // console.log();
      const target = event.target as HTMLElement;
      const isMemoItem = target.closest('.memo-item');
      if (!isMemoItem) return;

      const id = event.currentTarget.id;

      if (isSelecting) selectMemoItem(Number(id));
      else {
        searchParams.set('id', id);
        setDialogMemoId(Number(id));
        history.pushState({ openedMemoId: Number(id) }, '', searchParams.getUrl());
      }
    };

    return (
      <article
        {...props}
        id={String(memo.id)}
        className={cn('memo-item select-none transition-all [transform:translateZ(0)]', props.className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleMemoItemClick}>
        <motion.div layoutId={`memo-${memo.id}`}>
          <Card
            className={cn('relative box-content w-[300px] transition-all', {
              'border-primary cursor-pointer': isSelected,
            })}>
            <motion.div layoutId={`header-${memo.id}`}>
              <MemoCardHeader
                memo={memo}
                isHovered={isHovered}
                isSelected={isSelected}
                selectMemoItem={selectMemoItem}
              />
            </motion.div>
            <motion.div layoutId={`content-${memo.id}`}>
              {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
            </motion.div>
            <motion.div layoutId={`footer-${memo.id}`}>
              <MemoCardFooter memo={memo} lng={lng} isShowingOption={isHovered && !isSelecting} />
            </motion.div>
          </Card>
        </motion.div>
      </article>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.memo.id === nextProps.memo.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.memo.memo === nextProps.memo.memo &&
      prevProps.memo.category === nextProps.memo.category &&
      prevProps.isSelecting === nextProps.isSelecting
    );
  },
);
