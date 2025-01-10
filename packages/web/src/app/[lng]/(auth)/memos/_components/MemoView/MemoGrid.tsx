'use client';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { useKeyboardBind } from '@extension/shared/hooks';
import { GetMemoResponse } from '@extension/shared/types';
import { LanguageType } from '@src/modules/i18n';
import { AnimatePresence } from 'framer-motion';
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useSearchParams } from '@extension/shared/modules/search-params';
import { DragBox } from '@src/components';
import { useDrag } from '@src/hooks/useDrag';
import { useRouter } from 'next/navigation';
import MemoItem from './MemoItem';
import MemoOptionHeader from './MemoOptionHeader';
import { Loading, Skeleton } from '@extension/ui';

const MEMO_UNIT = 20;

const getItems = (nextGroupKey: number, count: number) => {
  const nextItems = [];
  const nextKey = nextGroupKey * MEMO_UNIT;

  for (let i = 0; i < count; ++i) {
    nextItems.push({ groupKey: nextGroupKey, key: nextKey + i });
  }
  return nextItems;
};

interface MemoGridProps extends LanguageType {
  memos: GetMemoResponse[];
  gridKey: string;
  id: string;
}

export default function MemoGrid({ lng, memos, gridKey, id }: MemoGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(() => getItems(0, MEMO_UNIT));

  const { dragStart, setDragStart, dragEnd, setDragEnd, isDragging, setIsDragging } = useDrag();

  const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);

  const checkMemoSelected = useCallback((id: number) => selectedMemoIds.includes(id), [selectedMemoIds]);
  const isAnyMemoSelected = useMemo(() => selectedMemoIds.length > 0, [selectedMemoIds]);

  const selectMemoItem = useCallback(
    (id: number) => {
      if (isDragging) return;

      if (checkMemoSelected(id)) setSelectedMemoIds(prevMemoIds => prevMemoIds.filter(prevMemo => prevMemo !== id));
      else setSelectedMemoIds(prevMemoIds => [...prevMemoIds, id]);
    },
    [selectedMemoIds],
  );

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragEnd({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isDragging) return;
      setDragEnd({ x: e.clientX, y: e.clientY });

      const selectionArea = {
        left: Math.min(dragStart.x, e.clientX),
        right: Math.max(dragStart.x, e.clientX),
        top: Math.min(dragStart.y, e.clientY),
        bottom: Math.max(dragStart.y, e.clientY),
      };

      const memoElements = document.querySelectorAll('.memo-item');
      const selectedIds = [...memoElements]
        .filter(element => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left < selectionArea.right &&
            rect.right > selectionArea.left &&
            rect.top < selectionArea.bottom &&
            rect.bottom > selectionArea.top
          );
        })
        .map(element => Number(element.id));

      setSelectedMemoIds(selectedIds);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const closeMemoOption = () => {
    setSelectedMemoIds([]);
    searchParams.removeAll('id');
    router.replace(searchParams.getUrl(), { scroll: false });
  };

  useKeyboardBind({ key: 'Escape', callback: closeMemoOption });

  if (!memos) return <Loading />;

  return (
    <div className="relative h-full w-full" onMouseDown={handleMouseDown}>
      {isDragging && <DragBox dragStart={dragStart} dragEnd={dragEnd} />}
      <AnimatePresence>
        {isAnyMemoSelected && (
          <MemoOptionHeader
            lng={lng}
            selectedMemoIds={selectedMemoIds}
            onXButtonClick={closeMemoOption}
            closeMemoOption={closeMemoOption}
          />
        )}
      </AnimatePresence>
      <MasonryInfiniteGrid
        useTransform
        className="container h-screen"
        placeholder={<Skeleton className="h-[300px] w-[300px]" />}
        gap={16}
        align="center"
        useResizeObserver
        observeChildren
        autoResize
        style={{
          willChange: 'transform',
        }}
        container={true}
        onRequestAppend={({ groupKey, currentTarget, wait, ready }: any) => {
          if (items.length >= memos.length) return;

          const nextGroupKey = (+groupKey! || 0) + 1;
          const maxAddItem = items.length + MEMO_UNIT > memos.length ? memos.length - items.length : MEMO_UNIT;

          if (maxAddItem === 0) return;

          wait();
          currentTarget.appendPlaceholders(MEMO_UNIT, nextGroupKey);

          setTimeout(() => {
            ready();
            setItems([...items, ...getItems(nextGroupKey, maxAddItem)]);
          }, 100);
        }}>
        {items.map(
          item =>
            memos.at(item.key) && (
              <MemoItem
                lng={lng}
                data-grid-groupkey={item.groupKey}
                key={item.key + gridKey}
                memo={memos.at(item.key)!}
                isSelected={checkMemoSelected(memos.at(item.key)!.id)}
                selectMemoItem={selectMemoItem}
                isSelecting={isAnyMemoSelected}
                className={memos.at(item.key)!.id !== Number(id) ? '' : 'invisible'}
              />
            ),
        )}
      </MasonryInfiniteGrid>
    </div>
  );
}
