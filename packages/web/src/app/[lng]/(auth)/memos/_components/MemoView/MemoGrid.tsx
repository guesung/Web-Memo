'use client';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { useKeyboardBind } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import type { GetMemoResponse } from '@extension/shared/types';
import { Skeleton } from '@extension/ui';
import { DragBox } from '@src/components';
import { useDrag } from '@src/hooks';
import type { LanguageType } from '@src/modules/i18n';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import MemoDialog from '../MemoDialog';
import MemoItem from './MemoItem';
import MemoOptionHeader from './MemoOptionHeader';

const MEMO_UNIT = 20;
const SCROLL_INTERVAL = 50;
const CONTAINER_ID = 'memo-grid';
const SCROLL_UNIT = 30;

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
}

export default function MemoGrid({ lng, memos }: MemoGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(() => getItems(0, MEMO_UNIT));
  const dragBoxRef = useRef<HTMLDivElement>(null);
  const [dialogMemoId, setDialogMemoId] = useState<number | null>();
  const rafRef = useRef<number>();

  const [selectedMemoIds, setSelectedMemoIds] = useState<number[]>([]);

  const checkMemoSelected = useCallback((id: number) => selectedMemoIds.includes(id), [selectedMemoIds]);

  const isSelectingMode = useMemo(() => selectedMemoIds.length > 0, [selectedMemoIds]);

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
      const [dragStartX, dragStartY] = [mouseDownEvent.clientX, mouseDownEvent.clientY];
      const dragStartTarget = mouseDownEvent.target as HTMLElement;

      const isMemoItem = dragStartTarget.closest('.memo-item');
      const isMemoGrid = dragStartTarget.closest(`#${CONTAINER_ID}`);
      if (!isMemoGrid || isMemoItem) return;

      const container = document.getElementById(CONTAINER_ID);
      if (!container) return;
      const initialScrollTop = container.scrollTop;

      const dragBox = dragBoxRef.current;
      if (!dragBox) return;

      let lastMouseEvent: MouseEvent | null = null;

      const updateDragBox = () => {
        if (!lastMouseEvent || !dragBox) return;

        const [dragEndX, dragEndY] = [lastMouseEvent.clientX, lastMouseEvent.clientY];

        // 스크롤
        const isNearBottom = window.innerHeight - dragEndY < SCROLL_INTERVAL;
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight;
        if (isNearBottom && !isAtBottom && !bottomTimeoutRef.current) {
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
        if (isNearTop && !isAtTop && !topTimeoutRef.current) {
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
    },
  });

  const closeMemoOption = () => {
    setSelectedMemoIds([]);
    searchParams.removeAll('id');
    router.replace(searchParams.getUrl(), { scroll: false });
  };

  const handleRequestAppend: ComponentProps<typeof MasonryInfiniteGrid>['onRequestAppend'] = ({
    groupKey = 0,
    currentTarget,
    wait,
    ready,
  }) => {
    if (items.length >= memos.length) return;

    const nextGroupKey = +groupKey + 1;
    const maxAddItem = items.length + MEMO_UNIT > memos.length ? memos.length - items.length : MEMO_UNIT;

    if (maxAddItem === 0) return;

    wait();
    currentTarget.appendPlaceholders(MEMO_UNIT, nextGroupKey);

    setTimeout(() => {
      ready();
      setItems(prevItems => [...prevItems, ...getItems(nextGroupKey, maxAddItem)]);
    }, 1);
  };

  useEffect(function updateDialogId() {
    const currentDialogId = searchParams.get('id');
    if (!currentDialogId) return;

    setDialogMemoId(Number(currentDialogId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(function closeDialogOnPopState() {
    const handlePopstate = () => {
      setDialogMemoId(history.state?.openedMemoId);
    };

    window.addEventListener('popstate', handlePopstate);
    return () => {
      window.removeEventListener('popstate', handlePopstate);
    };
  }, []);

  useEffect(function closeRAFOnUnmount() {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useKeyboardBind({ key: 'Escape', callback: closeMemoOption });

  return (
    <div className="relative h-full w-full">
      <DragBox ref={dragBoxRef} />
      <AnimatePresence>
        {isSelectingMode && (
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
        useResizeObserver
        observeChildren
        autoResize
        className="container h-screen max-w-full"
        container={true}
        useRecycle={false}
        id={CONTAINER_ID}
        gap={16}
        align="center"
        placeholder={<MemoItemSkeleton />}
        style={{
          willChange: 'transform',
        }}
        onRequestAppend={handleRequestAppend}>
        {items.map(
          item =>
            memos.at(item.key) && (
              <MemoItem
                key={memos.at(item.key).id}
                lng={lng}
                data-grid-groupkey={item.groupKey}
                memo={memos.at(item.key)}
                isMemoSelected={checkMemoSelected(memos.at(item.key).id)}
                selectMemoItem={handleSelectMemoItem}
                isSelectingMode={isSelectingMode}
                setDialogMemoId={setDialogMemoId}
              />
            ),
        )}
      </MasonryInfiniteGrid>
      {dialogMemoId && <MemoDialog lng={lng} memoId={dialogMemoId} setDialogMemoId={setDialogMemoId} />}
    </div>
  );
}

function MemoItemSkeleton() {
  return <Skeleton className="h-[300px] w-[300px]" />;
}
