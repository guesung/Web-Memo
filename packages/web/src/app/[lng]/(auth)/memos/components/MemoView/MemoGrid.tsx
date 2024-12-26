'use client';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { useKeyboardBind } from '@extension/shared/hooks';
import { GetMemoResponse } from '@extension/shared/types';
import { LanguageType } from '@src/modules/i18n';
import { AnimatePresence } from 'framer-motion';
import { KeyboardEvent, MouseEvent, useCallback, useMemo, useState, useEffect } from 'react';

import MemoItem from './MemoItem';
import MemoOptionHeader from './MemoOptionHeader';
import { DragBox } from '@src/components';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { useRouter } from 'next/navigation';
import { useDrag } from '@src/hooks/useDrag';

const MEMO_UNIT = 20;

const getMemoItems = (nextGroupKey: number, count: number, memos: GetMemoResponse[]) =>
  Array.from({ length: count }, (_, i) => ({
    groupKey: nextGroupKey,
    key: nextGroupKey * MEMO_UNIT + i,
    memo: memos[nextGroupKey * MEMO_UNIT + i],
  }));

interface MemoGridProps extends LanguageType {
  memos: GetMemoResponse[];
  gridKey: string;
}

export default function MemoGrid({ lng, memos, gridKey }: MemoGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { dragStart, setDragStart, dragEnd, setDragEnd, isDragging, setIsDragging } = useDrag();

  const [gridMemoItems, setGridMemoItemsItems] = useState(() => getMemoItems(0, MEMO_UNIT, memos));
  const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);
  const [hoveredMemoId, setHoveredMemoId] = useState<number[] | null>(null);

  const checkMemoSelected = useCallback((id: number) => selectedMemoIds.includes(id), [selectedMemoIds]);
  const isAnyMemoSelected = useMemo(() => selectedMemoIds.length > 0, [selectedMemoIds]);

  const selectMemoItem = useCallback((id: number) => {
    if (isDragging) return;

    if (checkMemoSelected(id)) setSelectedMemoIds(prevMemoIds => prevMemoIds.filter(prevMemo => prevMemo !== id));
    else setSelectedMemoIds(prevMemoIds => [...prevMemoIds, id]);
  }, []);

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

  const handleMemoItemMouseDown = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const id = event.currentTarget.id;

    if (isAnyMemoSelected) selectMemoItem(Number(id));
    else {
      searchParams.set('id', id);
      router.push(searchParams.getUrl(), { scroll: false });
    }
  };

  const closeMemoOption = () => {
    setSelectedMemoIds([]);
  };

  const handleGridRequestAppend = ({ groupKey }: any) => {
    if (gridMemoItems.length >= memos.length) return;

    const nextGroupKey = (+groupKey || 0) + 1;
    const maxAddItem =
      gridMemoItems.length + MEMO_UNIT > memos.length ? memos.length - gridMemoItems.length : MEMO_UNIT;

    if (maxAddItem === 0) return;

    setGridMemoItemsItems([...gridMemoItems, ...getMemoItems(nextGroupKey, maxAddItem, memos)]);
  };

  useKeyboardBind({ key: 'Escape', callback: closeMemoOption });

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
        className="container"
        gap={16}
        align="center"
        useResizeObserver
        observeChildren
        autoResize
        onRequestAppend={handleGridRequestAppend}>
        {gridMemoItems.map(
          ({ groupKey, memo, key }) =>
            memo && (
              <MemoItem
                lng={lng}
                data-grid-groupkey={groupKey}
                key={key + gridKey}
                memo={memo}
                isSelected={checkMemoSelected(memo.id)}
                isHovered={hoveredMemoId === memo.id}
                selectMemoItem={selectMemoItem}
                onMouseDown={handleMemoItemMouseDown}
                onMouseEnter={() => setHoveredMemoId(memo.id)}
                onMouseLeave={() => setHoveredMemoId(null)}
                isSelecting={isAnyMemoSelected}
              />
            ),
        )}
      </MasonryInfiniteGrid>
    </div>
  );
}
