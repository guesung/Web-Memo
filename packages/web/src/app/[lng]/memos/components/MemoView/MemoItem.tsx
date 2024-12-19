import { MOTION_VARIANTS } from '@extension/shared/constants';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { GetMemoResponse } from '@extension/shared/types';
import { cn } from '@extension/shared/utils';
import { Card, CardContent } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import { HTMLMotionProps, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { KeyboardEvent, memo, MouseEvent, useState } from 'react';

import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';

interface MemoItemProps extends HTMLMotionProps<'article'>, LanguageType {
  memo: GetMemoResponse;
  isSelected: boolean;
  isSelecting: boolean;
  handleMemoItemSelect: (id: number) => void;
}

export default memo(function MemoItem({
  lng,
  memo,
  isSelected,
  handleMemoItemSelect,
  isSelecting,
  ...props
}: MemoItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  if (!memo) return null;
  return (
    <motion.article
      id={String(memo.id)}
      variants={MOTION_VARIANTS.fadeInAndOut}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn('memo-item select-none', props.className)}
      tabIndex={0}
      {...props}>
      <Card
        className={cn('relative box-content w-[300px] transition-all', {
          'border-primary cursor-pointer': isSelected,
        })}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        <MemoCardHeader memo={memo} isHovered={isHovered} isSelected={isSelected} onSelect={handleMemoItemSelect} />
        {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
        <MemoCardFooter memo={memo} lng={lng} isOptionShown={isHovered && !isSelecting} />
      </Card>
    </motion.article>
  );
});
