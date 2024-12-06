'use client';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { useKeyboardBind } from '@extension/shared/hooks';
import { GetMemoResponse } from '@extension/shared/types';
import { LanguageType } from '@src/modules/i18n';
import { AnimatePresence } from 'framer-motion';
import { KeyboardEvent, MouseEvent, useCallback, useMemo, useState } from 'react';

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

  const isMemoSelected = useCallback((id: number) => selectedMemos.some(memo => memo.id === id), [selectedMemos]);
  const isAnyMemoSelected = useMemo(() => selectedMemos.length > 0, [selectedMemos]);

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
    <>
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
    </>
  );
}
