'use client';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { GetMemoResponse } from '@extension/shared/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';
import MemoItem from './MemoItem';
import { LanguageType } from '@src/modules/i18n';

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

  return (
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
        <motion.div
          key={item.key + gridKey}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          data-grid-groupkey={item.groupKey}>
          <MemoItem memo={memos.at(item.key)} lng={lng} />
        </motion.div>
      ))}
    </MasonryInfiniteGrid>
  );
}
