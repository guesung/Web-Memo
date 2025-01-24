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
import { useDrag, useScrollSync } from '@src/hooks';
import { useRouter } from 'next/navigation';
import MemoItem from './MemoItem';
import MemoOptionHeader from './MemoOptionHeader';
import MemoDialog from '../MemoDialog';

const MEMO_UNIT = 20;
const SCROLL_INTERVAL = 50;
const CONTAINER_ID = 'memo-grid';
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
}

export default function MemoGrid({ lng, memos, gridKey }: MemoGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(() => getItems(0, MEMO_UNIT));
  const dragBoxRef = useRef<HTMLDivElement>(null);
  const [dialogMemoId, setDialogMemoId] = useState<number | null>();
  const rafRef = useRef<number>();

  const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);

  const checkMemoSelected = useCallback((id: number) => selectedMemoIds.includes(id), [selectedMemoIds]);

  const isAnyMemoSelected = useMemo(() => selectedMemoIds.length > 0, [selectedMemoIds]);

  const handleSelectMemoItem = useCallback((id: number) => {
    setSelectedMemoIds(prev => {
      const index = prev.indexOf(id);
      if (index === -1) return [...prev, id];
      return prev.filter(memoId => memoId !== id);
    });
  }, []);

  const bottomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const topTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useDrag({
    onMouseDown: (mouseDownEvent: MouseEvent) => {
      const target = mouseDownEvent.target as HTMLElement;

      const isMemoItem = target.closest('.memo-item');
      const isMemoGrid = target.closest(`#${CONTAINER_ID}`);
      if (!isMemoGrid || isMemoItem) return;

      const container = document.getElementById(CONTAINER_ID);
      if (!container) return;
      const initialScrollTop = container.scrollTop;

      const onDrag = (dragStartX: number, dragStartY: number) => {
        const dragBox = dragBoxRef.current;
        if (!dragBox) return;

        let lastMouseEvent: MouseEvent | null = null;

        const updateDragBox = () => {
          if (!lastMouseEvent || !dragBox) return;

          const [dragEndX, dragEndY] = [lastMouseEvent.clientX, lastMouseEvent.clientY];

          // 스크롤
          const isNearBottom = window.innerHeight - dragEndY < SCROLL_INTERVAL;
          const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight;
          if (isNearBottom && !bottomTimeoutRef.current && !isAtBottom) {
            bottomTimeoutRef.current = setInterval(() => {
              if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
                clearInterval(bottomTimeoutRef.current!);
                bottomTimeoutRef.current = null;
                return;
              }
              container.scrollBy({ top: SCROLL_UNIT, behavior: 'auto' });
            }, 50);
          } else if (!isNearBottom && bottomTimeoutRef.current) {
            clearInterval(bottomTimeoutRef.current);
            bottomTimeoutRef.current = null;
          }

          const isNearTop = dragEndY < SCROLL_INTERVAL;
          const isAtTop = container.scrollTop === 0;
          if (isNearTop && !topTimeoutRef.current && !isAtTop) {
            topTimeoutRef.current = setInterval(() => {
              if (container.scrollTop === 0) {
                clearInterval(topTimeoutRef.current!);
                topTimeoutRef.current = null;
                return;
              }
              container.scrollBy({ top: -SCROLL_UNIT, behavior: 'auto' });
            }, 50);
          } else if (!isNearTop && topTimeoutRef.current) {
            clearInterval(topTimeoutRef.current);
            topTimeoutRef.current = null;
          }

          const containerScrolledY = dragStartY - (container.scrollTop - initialScrollTop);

          // 드래그 박스
          const [left, top, right, bottom] = [
            Math.min(dragStartX, dragEndX),
            Math.min(containerScrolledY, dragEndY),
            Math.max(dragStartX, dragEndX),
            Math.max(containerScrolledY, dragEndY),
          ];

          const [width, height] = [Math.abs(dragEndX - dragStartX), Math.abs(dragEndY - containerScrolledY)];

          dragBox.style.transform = `translate(${left}px, ${top}px) scale(${width}, ${height})`;

          // 선택된 메모 업데이트
          const memoElements = document.querySelectorAll('.memo-item');
          const selectedIds = [...memoElements]
            .filter(element => {
              const rect = element.getBoundingClientRect();
              return rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top;
            })
            .map(element => Number(element.id));

          setSelectedMemoIds(selectedIds);
          rafRef.current = requestAnimationFrame(updateDragBox);
        };

        const handleMouseMove = (mouseMoveEvent: globalThis.MouseEvent) => {
          mouseMoveEvent.stopPropagation();
          lastMouseEvent = mouseMoveEvent;

          if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(updateDragBox);
          }
        };

        const handleMouseUp = () => {
          document.body.removeEventListener('mousemove', handleMouseMove);
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = undefined;
          }

          if (dragBoxRef.current) dragBoxRef.current.style.transform = '';

          if (bottomTimeoutRef.current) {
            clearInterval(bottomTimeoutRef.current);
            bottomTimeoutRef.current = null;
          }

          if (topTimeoutRef.current) {
            clearInterval(topTimeoutRef.current);
            topTimeoutRef.current = null;
          }
        };

        document.body.addEventListener('mousemove', handleMouseMove);
        document.body.addEventListener('mouseup', handleMouseUp);
      };

      onDrag(mouseDownEvent.clientX, mouseDownEvent.clientY);
    },
  });

  const closeMemoOption = () => {
    setSelectedMemoIds([]);
    searchParams.removeAll('id');
    router.replace(searchParams.getUrl(), { scroll: false });
  };

  useEffect(() => {
    const currentDialogId = searchParams.get('id');
    if (!currentDialogId) return;

    setDialogMemoId(Number(currentDialogId));
  }, []);

  useEffect(() => {
    const handlePopstate = () => {
      setDialogMemoId(history.state?.openedMemoId);
    };

    window.addEventListener('popstate', handlePopstate);
    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, []);

  useKeyboardBind({ key: 'Escape', callback: closeMemoOption });

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (!memos) return <Loading />;

  return (
    <div className="relative h-full w-full">
      <DragBox ref={dragBoxRef} />
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
        useRecycle={false}
        align="center"
        useResizeObserver
        observeChildren
        autoResize
        container={true}
        id={CONTAINER_ID}
        style={{
          willChange: 'transform',
        }}
        onRequestAppend={({ groupKey, currentTarget, wait, ready }) => {
          if (items.length >= memos.length) return;

          const nextGroupKey = (+groupKey! || 0) + 1;
          const maxAddItem = items.length + MEMO_UNIT > memos.length ? memos.length - items.length : MEMO_UNIT;

          if (maxAddItem === 0) return;

          wait();
          currentTarget.appendPlaceholders(MEMO_UNIT, nextGroupKey);

          setTimeout(() => {
            ready();
            setItems(prevItems => [...prevItems, ...getItems(nextGroupKey, maxAddItem)]);
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
                selectMemoItem={handleSelectMemoItem}
                isSelecting={isAnyMemoSelected}
                setDialogMemoId={setDialogMemoId}
              />
            ),
        )}
      </MasonryInfiniteGrid>
      {dialogMemoId && <MemoDialog lng={lng} memoId={dialogMemoId} setDialogMemoId={setDialogMemoId} />}
    </div>
  );
}
