'use client';

import { useMemoListQuery } from '@extension/shared/hooks';
import { requestRefetchTheMemoList } from '@extension/shared/utils/extension';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { getSupabaseClient } from '@src/utils/supabase.client';
import { UseQueryResult } from '@tanstack/react-query';

import { HTMLAttributes, MouseEventHandler, useState } from 'react';

import { MemoRow, MemoSupabaseResponse } from '@extension/shared/types';
import { useMemoDeleteMutation } from '@src/hooks';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useGuide } from '../hooks';

function getItems(nextGroupKey: number, count: number) {
  const nextItems = [];
  const nextKey = nextGroupKey * 10;

  for (let i = 0; i < count; ++i) {
    nextItems.push({ groupKey: nextGroupKey, key: nextKey + i });
  }
  return nextItems;
}

export default function MemoGrid() {
  const supabaseClient = getSupabaseClient();
  // TODO :타입 에러로 인해 타입 단언으로 임시 해결
  const { data: memoListData }: UseQueryResult<MemoSupabaseResponse, Error> = useMemoListQuery({
    supabaseClient,
  });
  const memoList = memoListData?.data;
  const [items, setItems] = useState(() => getItems(0, 10));
  const [hoveredMemoId, setHoverdMemoId] = useState<null | string>(null);

  const handleMouseEnter: MouseEventHandler<HTMLDivElement> = event => {
    const id = event.currentTarget.id;
    setHoverdMemoId(id);
  };
  const handleMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    setHoverdMemoId(null);
  };
  useGuide();

  if (!memoList || memoList.length === 0)
    return <p className="text-center mt-8">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>;
  return (
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
        const maxAddItem = items.length + 10 > memoList.length ? memoList.length - items.length : 10;

        if (maxAddItem === 0) return;

        setItems([...items, ...getItems(nextGroupKey, maxAddItem)]);
      }}>
      {items.map((item, index) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, delay: index < 5 ? 0 : Math.min(index * 0.05, 0.5) }}>
          <MemoItem
            data-grid-groupkey={item.groupKey}
            memo={memoList.at(item.key)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            isHovered={hoveredMemoId === String(memoList.at(item.key)?.id)}
          />
        </motion.div>
      ))}
    </MasonryInfiniteGrid>
  );
}

interface MemoItemProps extends HTMLAttributes<HTMLDivElement> {
  isHovered: boolean;
  memo?: MemoRow;
}

function MemoItem({ isHovered, memo, ...props }: MemoItemProps) {
  if (!memo) return null;
  const { mutate: mutateMemoDelete } = useMemoDeleteMutation({
    handleSuccess: requestRefetchTheMemoList,
  });

  const handleDeleteClick = () => {
    const answer = window.confirm('정말로 메모를 삭제하시겠습니까? 복구는 불가능합니다.');
    if (!answer) return;
    mutateMemoDelete(memo.id);
  };

  return (
    <div className="bg-base-100 shadow-xl card box-border w-[300px]" id={String(memo.id)} {...props}>
      <div className="card-body relative p-6">
        <Link className="flex gap-2 link-hover" href={memo.url} target="_blank">
          {memo?.favIconUrl ? (
            <Image
              src={memo.favIconUrl}
              width={16}
              height={16}
              alt="favicon"
              className="float-left"
              style={{ objectFit: 'contain' }}
            />
          ) : (
            <></>
          )}
          <span className="font-bold line-clamp-1">{memo.title}</span>
        </Link>
        <div className="break-all whitespace-break-spaces">{memo.memo}</div>
        <span className="text-xs absolute right-2 bottom-2 text-stone-500">
          {(new Date(memo.updated_at).getMonth() + 1) % 12}/{new Date(memo.updated_at).getDate()}
        </span>
        {isHovered ? (
          <span className="absolute right-4 top-6 cursor-pointer" onClick={handleDeleteClick}>
            X
          </span>
        ) : (
          ''
        )}
      </div>
    </div>
  );
}
