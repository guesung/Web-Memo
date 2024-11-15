'use client';

import { useMemoListQuery } from '@extension/shared/hooks';
import { requestRefetchTheMemoList } from '@extension/shared/utils/extension';

import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { getSupabaseClient } from '@src/utils/supabase.client';

import { HTMLAttributes, MouseEventHandler, useState } from 'react';

import { MemoRow } from '@extension/shared/types';
import { useMemoDeleteMutation } from '@src/hooks';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useGuide } from '../hooks';
import { formatDate } from '@extension/shared/utils';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const category = searchParams.get('category') ?? '';
  const id = searchParams.get('id') ?? '';
  const supabaseClient = getSupabaseClient();
  const { data: memoListData } = useMemoListQuery({
    supabaseClient,
  });
  const memoList = memoListData?.data?.filter(memo => {
    if (!category && !memo?.category?.includes('wish')) return true;
    return memo?.category?.includes(category);
  });
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
    router.replace(`${pathname}?id=${id}`, { scroll: false });
  };
  useGuide();

  if (!memoList || memoList.length === 0)
    return <p className="mt-8 text-center">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>;
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
    <div className="bg-base-100 card box-border w-[300px] shadow-xl" id={String(memo.id)} {...props}>
      <div className="card-body relative p-6">
        <Link className="link-hover flex gap-2" href={memo.url} target="_blank">
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
          <span className="line-clamp-1 font-bold">{memo.title}</span>
        </Link>
        <div className="whitespace-break-spaces break-all">{memo.memo}</div>
        <span className="absolute bottom-2 right-2 text-xs text-stone-500">{formatDate(memo.updated_at, 'mm/dd')}</span>
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
