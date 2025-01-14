import { GetMemoResponse } from '@extension/shared/types';
import { cn } from '@extension/shared/utils';
import { Card, CardContent } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import { HTMLAttributes, memo, MouseEvent, useState } from 'react';

import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';
import { useRouter } from 'next/navigation';
import { useSearchParams } from '@extension/shared/modules/search-params';

interface MemoItemProps extends HTMLAttributes<HTMLElement>, LanguageType {
  memo: GetMemoResponse;
  isSelecting: boolean;
  selectMemoItem: (id: number) => void;
  isSelected: boolean;
}

export default memo(function MemoItem({ lng, memo, selectMemoItem, isSelecting, isSelected, ...props }: MemoItemProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleMemoItemMouseDown = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const id = event.currentTarget.id;

    if (isSelecting) selectMemoItem(Number(id));
    else {
      searchParams.set('id', id);
      router.push(searchParams.getUrl(), { scroll: false });
    }
  };

  return (
    <article
      {...props}
      id={String(memo.id)}
      className={cn('memo-item select-none transition-all', props.className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMemoItemMouseDown}>
      <Card
        className={cn('relative box-content w-[300px] transition-all', {
          'border-primary cursor-pointer': isSelected,
        })}>
        <MemoCardHeader memo={memo} isHovered={isHovered} isSelected={isSelected} selectMemoItem={selectMemoItem} />
        {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
        <MemoCardFooter memo={memo} lng={lng} isShowingOption={isHovered && !isSelecting} />
      </Card>
    </article>
  );
});
