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

const getMemoItems = (nextGroupKey: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ groupKey: nextGroupKey, key: nextGroupKey * MEMO_UNIT + i }));

interface MemoGridProps extends LanguageType {
  memos: GetMemoResponse[];
  gridKey: string;
}

export default function MemoGrid({ lng, memos, gridKey }: MemoGridProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState(() => getMemoItems(0, MEMO_UNIT));
  const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);
  const [hoveredMemoId, setHoveredMemoId] = useState<number[] | null>(null);

  const { dragStart, setDragStart, dragEnd, setDragEnd, isDragging, setIsDragging } = useDrag();

  const checkMemoSelected = useCallback((id: number) => selectedMemoIds.includes(id), [selectedMemoIds]);
  const isAnyMemoSelected = useMemo(() => selectedMemoIds.length > 0, [selectedMemoIds]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragEnd({ x: e.clientX, y: e.clientY });
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

  const handleMemoItemSelect = (id: number) => {
    if (isDragging) return;

    if (checkMemoSelected(id)) setSelectedMemoIds(prevMemoIds => prevMemoIds.filter(prevMemo => prevMemo !== id));
    else setSelectedMemoIds(prevMemoIds => [...prevMemoIds, id]);
  };

  const handleMemoItemMouseDown = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const id = Number(event.currentTarget.id);

    if (isAnyMemoSelected) {
      handleMemoItemSelect(id);
    } else {
      searchParams.set('id', String(id));
      router.push(searchParams.getUrl(), { scroll: false });
    }
  };

  const closeMemoOption = () => {
    setSelectedMemoIds([]);
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
        onRequestAppend={e => {
          if (items.length >= memos.length) return;

          const nextGroupKey = (+e.groupKey! || 0) + 1;
          const maxAddItem = items.length + MEMO_UNIT > memos.length ? memos.length - items.length : MEMO_UNIT;

          if (maxAddItem === 0) return;

          setItems([...items, ...getMemoItems(nextGroupKey, maxAddItem)]);
        }}>
        {items.map(
          item =>
            memos.at(item.key) && (
              <MemoItem
                key={item.key + gridKey}
                memo={memos.at(item.key)!}
                lng={lng}
                isSelected={checkMemoSelected(memos.at(item.key)!.id)}
                isHovered={hoveredMemoId === memos.at(item.key)!.id}
                onMouseDown={handleMemoItemMouseDown}
                handleMemoItemSelect={handleMemoItemSelect}
                onMouseEnter={() => setHoveredMemoId(memos.at(item.key)!.id)}
                onMouseLeave={() => setHoveredMemoId(null)}
                isSelecting={isAnyMemoSelected}
                data-grid-groupkey={item.groupKey}
              />
            ),
        )}
      </MasonryInfiniteGrid>
    </div>
  );
}
