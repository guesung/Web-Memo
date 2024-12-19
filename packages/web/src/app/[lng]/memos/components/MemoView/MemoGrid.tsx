'use client';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { useKeyboardBind } from '@extension/shared/hooks';
import { GetMemoResponse } from '@extension/shared/types';
import { LanguageType } from '@src/modules/i18n';
import { AnimatePresence } from 'framer-motion';
import { KeyboardEvent, MouseEvent, useCallback, useMemo, useState, useEffect } from 'react';

import MemoItem from './MemoItem';
import MemoOptionHeader from './MemoOptionHeader';

const MEMO_UNIT = 20;

const getMemoItems = (nextGroupKey: number, count: number) => {
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
}

export default function MemoGrid({ lng, memos, gridKey }: MemoGridProps) {
  const [items, setItems] = useState(() => getMemoItems(0, MEMO_UNIT));
  const [selectedMemos, setSelectedMemos] = useState<GetMemoResponse[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragEnd, setDragEnd] = useState({ x: 0, y: 0 });

  const isMemoSelected = useCallback((id: number) => selectedMemos.some(memo => memo.id === id), [selectedMemos]);
  const isAnyMemoSelected = useMemo(() => selectedMemos.length > 0, [selectedMemos]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragEnd({ x: e.clientX, y: e.clientY });
    setSelectedMemos([]);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setDragEnd({ x: e.clientX, y: e.clientY });
    
    // Find elements within the selection area
    const selectionArea = {
      left: Math.min(dragStart.x, e.clientX),
      right: Math.max(dragStart.x, e.clientX),
      top: Math.min(dragStart.y, e.clientY),
      bottom: Math.max(dragStart.y, e.clientY),
    };

    const memoElements = document.querySelectorAll('.memo-item');
    const selectedIds: number[] = [];

    memoElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (
        rect.left < selectionArea.right &&
        rect.right > selectionArea.left &&
        rect.top < selectionArea.bottom &&
        rect.bottom > selectionArea.top
      ) {
        const id = Number(element.id);
        selectedIds.push(id);
      }
    });

    setSelectedMemos(memos.filter(memo => selectedIds.includes(memo.id)));
  }, [isDragging, dragStart, memos]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  const handleMemoItemSelect = (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    event.stopPropagation();

    const id = Number(event.currentTarget.id);

    if (isMemoSelected(id)) setSelectedMemos(prev => prev.filter(memo => memo.id !== id));
    else setSelectedMemos(prev => [...prev, memos.find(memo => memo.id === id)!]);
  };

  const closeMemoOption = () => {
    setSelectedMemos([]);
  };

  useKeyboardBind({ key: 'Escape', callback: closeMemoOption });

  return (
    <div 
      className="relative w-full h-full"
      onMouseDown={handleMouseDown}
    >
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(dragStart.x, dragEnd.x),
            top: Math.min(dragStart.y, dragEnd.y),
            width: Math.abs(dragEnd.x - dragStart.x),
            height: Math.abs(dragEnd.y - dragStart.y),
            backgroundColor: 'rgba(66, 153, 225, 0.2)',
            border: '1px solid rgba(66, 153, 225, 0.5)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      )}
      <AnimatePresence>
        {isAnyMemoSelected && (
          <MemoOptionHeader
            lng={lng}
            selectedMemos={selectedMemos}
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
                isSelected={isMemoSelected(memos.at(item.key)!.id)}
                onSelect={handleMemoItemSelect}
                isSelecting={isAnyMemoSelected}
                data-grid-groupkey={item.groupKey}
              />
            ),
        )}
      </MasonryInfiniteGrid>
    </div>
  );
}
