import { MOTION_VARIANTS } from '@extension/shared/constants';
import { GetMemoResponse } from '@extension/shared/types';
import { cn } from '@extension/shared/utils';
import { Card, CardContent } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import { HTMLMotionProps, motion } from 'framer-motion';
import { memo } from 'react';

import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';

interface MemoItemProps extends HTMLMotionProps<'article'>, LanguageType {
  memo: GetMemoResponse;
  isSelecting: boolean;
  selectMemoItem: (id: number) => void;
  isSelected: boolean;
  isHovered: boolean;
}

export default memo(function MemoItem({
  lng,
  memo,
  selectMemoItem,
  isSelecting,
  isSelected,
  isHovered,
  ...props
}: MemoItemProps) {
  return (
    <motion.article
      id={String(memo.id)}
      variants={MOTION_VARIANTS.fadeInAndOut}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('memo-item select-none transition-all', props.className)}
      tabIndex={0}
      {...props}>
      <Card
        className={cn('relative box-content w-[300px] transition-all', {
          'border-primary cursor-pointer': isSelected,
        })}>
        <MemoCardHeader memo={memo} isHovered={isHovered} isSelected={isSelected} selectMemoItem={selectMemoItem} />
        {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
        <MemoCardFooter memo={memo} lng={lng} isHovered={isHovered} isSelecting={isSelecting} />
      </Card>
    </motion.article>
  );
});
