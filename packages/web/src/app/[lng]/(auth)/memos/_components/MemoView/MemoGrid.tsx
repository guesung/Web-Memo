'use client';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { useKeyboardBind } from '@extension/shared/hooks';
import { GetMemoResponse } from '@extension/shared/types';
import { LanguageType } from '@src/modules/i18n';
import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSearchParams } from '@extension/shared/modules/search-params';
import { Loading, Skeleton } from '@extension/ui';
import { DragBox } from '@src/components';
import { useDrag } from '@src/hooks/useDrag';
import { useRouter } from 'next/navigation';
import { useThrottle, useRAF } from '@extension/shared/hooks';
import MemoItem from './MemoItem';
import MemoOptionHeader from './MemoOptionHeader';

const MEMO_UNIT = 20;
const THRESHOLD = 50;
const SCROLL_UNIT = 30;
const THROTTLE_DELAY = 16; // 약 60fps

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

  const { throttle, abortThrottle } = useThrottle();
  const { schedule: scheduleRAF, cancel: cancelRAF } = useRAF();
  const lastMouseEventRef = useRef<MouseEvent>();

  const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);

  const checkMemoSelected = useCallback((id: number) => selectedMemoIds.includes(id), [selectedMemoIds]);
  const isAnyMemoSelected = useMemo(() => selectedMemoIds.length > 0, [selectedMemoIds]);

  const bottomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const topTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectMemoItem = useCallback(
    (id: number) => {
      if (checkMemoSelected(id)) setSelectedMemoIds(prevMemoIds => prevMemoIds.filter(prevMemo => prevMemo !== id));
      else setSelectedMemoIds(prevMemoIds => [...prevMemoIds, id]);
    },
    [selectedMemoIds],
  );

  const handleMouseDown = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest('#memo-grid') || target.closest('.memo-item')) return;

    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragEnd({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    const updateDragSelection = () => {
      const lastEvent = lastMouseEventRef.current;
      if (!lastEvent) return;

      const container = document.querySelector('.container');
      if (!container) return;

      const viewportHeight = window.innerHeight;
      const isNearBottom = viewportHeight - lastEvent.clientY < THRESHOLD;
      const isNearTop = lastEvent.clientY < THRESHOLD;

      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight;
      const isAtTop = container.scrollTop <= 0;

      if (isNearBottom && !bottomTimeoutRef.current && !isAtBottom) {
        bottomTimeoutRef.current = setInterval(() => {
          if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
            clearInterval(bottomTimeoutRef.current!);
            bottomTimeoutRef.current = null;
            return;
          }
          container.scrollBy({ top: SCROLL_UNIT, behavior: 'auto' });
          setDragStart(prev => ({ ...prev, y: prev.y - SCROLL_UNIT }));
          setDragEnd(prev => ({ ...prev, y: prev.y - SCROLL_UNIT }));
        }, 50);
      } else if ((!isNearBottom || isAtBottom) && bottomTimeoutRef.current) {
        clearInterval(bottomTimeoutRef.current);
        bottomTimeoutRef.current = null;
      }

      if (isNearTop && !topTimeoutRef.current && !isAtTop) {
        topTimeoutRef.current = setInterval(() => {
          if (container.scrollTop === 0) {
            clearInterval(topTimeoutRef.current!);
            topTimeoutRef.current = null;
            return;
          }
          container.scrollBy({ top: -SCROLL_UNIT, behavior: 'auto' });
          setDragStart(prev => ({ ...prev, y: prev.y + SCROLL_UNIT }));
          setDragEnd(prev => ({ ...prev, y: prev.y + SCROLL_UNIT }));
        }, 50);
      } else if ((!isNearTop || isAtTop) && topTimeoutRef.current) {
        clearInterval(topTimeoutRef.current);
        topTimeoutRef.current = null;
      }

      setDragEnd({ x: lastEvent.clientX, y: lastEvent.clientY });

      const selectionArea = {
        left: Math.min(dragStart.x, lastEvent.clientX),
        right: Math.max(dragStart.x, lastEvent.clientX),
        top: Math.min(dragStart.y, lastEvent.clientY),
        bottom: Math.max(dragStart.y, lastEvent.clientY),
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
      scheduleRAF(updateDragSelection);
    };

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isDragging) return;
      lastMouseEventRef.current = e;
      throttle(() => scheduleRAF(updateDragSelection), THROTTLE_DELAY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      abortThrottle();
      cancelRAF();
      lastMouseEventRef.current = undefined;

      if (bottomTimeoutRef.current) {
        clearInterval(bottomTimeoutRef.current);
        bottomTimeoutRef.current = null;
      }

      if (topTimeoutRef.current) {
        clearInterval(topTimeoutRef.current);
        topTimeoutRef.current = null;
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      abortThrottle();
      cancelRAF();
    };
  }, [isDragging, dragStart]);

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
        container={true}
        id="memo-grid"
        style={{
          willChange: 'transform',
        }}
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
              />
            ),
        )}
      </MasonryInfiniteGrid>
    </div>
  );
}
