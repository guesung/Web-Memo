'use client';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { useCloseOnEscape } from '@extension/shared/hooks';
import { GetMemoResponse } from '@extension/shared/utils';
import { LanguageType } from '@src/modules/i18n';
import { KeyboardEvent, MouseEvent, useState } from 'react';

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
  const [selectedMemos, setSelectedMemos] = useState<string[]>([]);

  const handleSelect = (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
    e.stopPropagation();

    const id = e.currentTarget.id;
    if (!id) return;

    if (selectedMemos.includes(id)) setSelectedMemos(prev => prev.filter(memo => memo !== id));
    else setSelectedMemos(prev => [...prev, id]);
  };

  useCloseOnEscape(() => {
    setSelectedMemos([]);
  });

  return (
    <>
      <MemoOptionHeader lng={lng} selectedMemoLength={selectedMemos.length} />
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
        {items.map(item => (
          <MemoItem
            key={item.key + gridKey}
            memo={memos.at(item.key)}
            lng={lng}
            isSelected={selectedMemos.includes(String(memos.at(item.key)?.id))}
            onSelect={handleSelect}
            isSelecting={selectedMemos.length > 0}
            data-grid-groupkey={item.groupKey}
          />
        ))}
      </MasonryInfiniteGrid>
    </>
  );
}
