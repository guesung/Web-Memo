'use client';

import { useMemoListQuery, useSearchParamsRouter } from '@extension/shared/hooks';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { getSupabaseClient } from '@src/utils/supabase.client';

import { MouseEventHandler, useState } from 'react';

import { motion } from 'framer-motion';

import { useGuide } from '../hooks';
import MemoItem from './MemoItem';
import MemoModal from './MemoModal';

const MEMO_UNIT = 20;

function getItems(nextGroupKey: number, count: number) {
  const nextItems = [];
  const nextKey = nextGroupKey * MEMO_UNIT;

  for (let i = 0; i < count; ++i) {
    nextItems.push({ groupKey: nextGroupKey, key: nextKey + i });
  }
  return nextItems;
}

export default function MemoGrid() {
  const isWishSearchParamsRouter = useSearchParamsRouter('wish');
  const idSearchParamsRouter = useSearchParamsRouter('id');
  const isWish = isWishSearchParamsRouter.get() === 'true';
  const supabaseClient = getSupabaseClient();
  const { data: memoListData } = useMemoListQuery({
    supabaseClient,
  });

  const memoList = memoListData?.data?.filter(memo => isWish === !!memo.isWish);
  const [items, setItems] = useState(() => getItems(0, MEMO_UNIT));
  const [hoveredMemoId, setHoverdMemoId] = useState<null | string>(null);

  const handleMemoMouseEnter: MouseEventHandler<HTMLDivElement> = event => {
    const id = event.currentTarget.id;
    setHoverdMemoId(id);
  };
  const handleMemoMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    setHoverdMemoId(null);
  };
  const handleMemoClick: MouseEventHandler<HTMLDivElement> = event => {
    const id = event.currentTarget.id;
    idSearchParamsRouter.set(id);
  };
  useGuide();

  if (!memoList || memoList.length === 0)
    return (
      <p className="mt-8 w-full text-center">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>
    );
  return (
    <>
      <MemoModal />
      <MasonryInfiniteGrid
        className="container"
        gap={16}
        align="center"
        useResizeObserver
        observeChildren
        autoResize
        onRequestAppend={e => {
          if (items.length >= memoList.length) return;

          const nextGroupKey = (+e.groupKey! || 0) + 1;
          const maxAddItem = items.length + MEMO_UNIT > memoList.length ? memoList.length - items.length : MEMO_UNIT;

          if (maxAddItem === 0) return;

          setItems([...items, ...getItems(nextGroupKey, maxAddItem)]);
        }}>
        {items.map(item => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            data-grid-groupkey={item.groupKey}>
            <MemoItem
              memo={memoList.at(item.key)}
              onMouseEnter={handleMemoMouseEnter}
              onMouseLeave={handleMemoMouseLeave}
              onClick={handleMemoClick}
              isHovered={hoveredMemoId === String(memoList.at(item.key)?.id)}
            />
          </motion.div>
        ))}
      </MasonryInfiniteGrid>
    </>
  );
}
