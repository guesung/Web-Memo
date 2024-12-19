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
  onSelect: (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
}

export default memo(function MemoItem({ lng, memo, isSelected, onSelect, isSelecting, ...props }: MemoItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const handleItemClick = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
    const id = event.currentTarget.id;
    if (!id) return;

    if (isSelecting) {
      onSelect(event);
      return;
    }

    searchParams.set('id', id);
    router.push(searchParams.getUrl(), { scroll: false });
  };

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
      onClick={handleItemClick}
      onKeyDown={e => e.key === 'Enter' && handleItemClick(e)}
      className={cn('memo-item select-none', props.className)}
      tabIndex={0}
      {...props}>
      <Card
        className={cn('relative box-content w-[300px] transition-all', {
          'border-primary cursor-pointer': isSelected,
        })}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        <MemoCardHeader memo={memo} isHovered={isHovered} isSelected={isSelected} onSelect={onSelect} />
        {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
        <MemoCardFooter memo={memo} lng={lng} isOptionShown={isHovered && !isSelecting} />
      </Card>
    </motion.article>
  );
});
