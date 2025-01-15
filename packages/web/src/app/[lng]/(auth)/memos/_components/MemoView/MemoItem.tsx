import { GetMemoResponse } from '@extension/shared/types';
import { cn } from '@extension/shared/utils';
import { Card, CardContent, Loading } from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import { HTMLAttributes, memo, MouseEvent, Suspense, useState } from 'react';

import MemoCardFooter from '../MemoCardFooter';
import MemoCardHeader from '../MemoCardHeader';
import { useRouter } from 'next/navigation';
import { useSearchParams } from '@extension/shared/modules/search-params';
import dynamic from 'next/dynamic';
import MemoDialog from '../MemoDialog';

interface MemoItemProps extends HTMLAttributes<HTMLElement>, LanguageType {
  memo: GetMemoResponse;
  isSelecting: boolean;
  selectMemoItem: (id: number) => void;
  isSelected: boolean;
}

export default memo(function MemoItem({ lng, memo, selectMemoItem, isSelecting, isSelected, ...props }: MemoItemProps) {
  const searchParams = useSearchParams();
  const [isHovered, setIsHovered] = useState(false);
  const [open, setOpen] = useState(memo.id === Number(searchParams.get('id')));

  const handleMouseEnter = () => {
    setIsHovered(true);
  };
  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleMemoItemClick = (event: MouseEvent<HTMLElement>) => {
    const id = event.currentTarget.id;

    if (isSelecting) selectMemoItem(Number(id));
    else {
      setOpen(true);
      searchParams.set('id', id);
      window.history.replaceState(
        { ...window.history.state, as: searchParams.getUrl(), url: searchParams.getUrl() },
        '',
        searchParams.getUrl(),
      );
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
      <Card
        className={cn('relative box-content w-[300px] transition-all', {
          'border-primary cursor-pointer': isSelected,
        })}>
        <MemoCardHeader memo={memo} isHovered={isHovered} isSelected={isSelected} selectMemoItem={selectMemoItem} />
        {memo.memo && <CardContent className="whitespace-break-spaces break-all">{memo.memo}</CardContent>}
        <MemoCardFooter memo={memo} lng={lng} isShowingOption={isHovered && !isSelecting} />
      </Card>

      {open && <MemoDialog lng={lng} id={memo.id} open={open} setOpen={setOpen} />}
    </article>
  );
});
