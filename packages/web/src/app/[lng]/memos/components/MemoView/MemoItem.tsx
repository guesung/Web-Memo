import { useSearchParams } from '@extension/shared/modules/search-params';
import { cn, GetMemoResponse } from '@extension/shared/utils';
import { Card, CardContent } from '@src/components/ui/card';
import { LanguageType } from '@src/modules/i18n';
import { HTMLMotionProps, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { KeyboardEvent, memo, MouseEvent, useState } from 'react';

import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';

interface MemoItemProps extends HTMLMotionProps<'article'>, LanguageType {
  memo?: GetMemoResponse;
  isSelected?: boolean;
  onSelect: (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  isSelecting?: boolean;
}

export default memo(function MemoItem({ lng, memo, isSelected, onSelect, isSelecting, ...props }: MemoItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  if (!memo) return null;

  const handleItemClick = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    const id = event.currentTarget.id;
    if (!id) return;

    if (isSelecting) {
      onSelect(event);
      return;
    }

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
      id={String(memo.id)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleItemClick}
      onKeyDown={e => e.key === 'Enter' && handleItemClick(e)}
      className="transition-all"
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
        <MemoCardFooter memo={memo} lng={lng} isHovered={isHovered} />
      </Card>
    </motion.article>
  );
});
