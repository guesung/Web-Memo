'use client';

import { useMemosQuery, useSearchParamsRouter } from '@extension/shared/hooks';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { MouseEventHandler, useState } from 'react';
import { motion } from 'framer-motion';
import { useGuide } from '../../hooks';
import MemoItem from './MemoItem';

const MEMO_UNIT = 20;

function getMemoItems(nextGroupKey: number, count: number) {
  const nextItems = [];
  const nextKey = nextGroupKey * MEMO_UNIT;

  for (let i = 0; i < count; ++i) {
    nextItems.push({ groupKey: nextGroupKey, key: nextKey + i });
  }
  return nextItems;
}

export default function MemoGrid() {
  const isWish = useSearchParamsRouter('wish').get() === 'true';
  const category = useSearchParamsRouter('category').get();

  const supabaseClient = getSupabaseClient();
  const { memos } = useMemosQuery({
    supabaseClient,
  });

  const filteredMemos = memos
    ?.filter(memo => isWish === !!memo.isWish)
    .filter(memo => (category ? memo.category?.name === category : true));
  const [items, setItems] = useState(() => getMemoItems(0, MEMO_UNIT));

  useGuide();

  if (!filteredMemos || filteredMemos.length === 0)
    return (
      <p className="mt-8 w-full text-center">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>
    );
  return (
    <>
      <MasonryInfiniteGrid
        className="container"
        gap={16}
        align="center"
        useResizeObserver
        observeChildren
        autoResize
        onRequestAppend={e => {
          if (items.length >= filteredMemos.length) return;

          const nextGroupKey = (+e.groupKey! || 0) + 1;
          const maxAddItem =
            items.length + MEMO_UNIT > filteredMemos.length ? filteredMemos.length - items.length : MEMO_UNIT;

          if (maxAddItem === 0) return;

          setItems([...items, ...getMemoItems(nextGroupKey, maxAddItem)]);
        }}>
        {items.map(item => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            data-grid-groupkey={item.groupKey}>
            <MemoItem memo={filteredMemos.at(item.key)} />
          </motion.div>
        ))}
      </MasonryInfiniteGrid>
    </>
  );
}
