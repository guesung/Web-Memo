'use client';

import { useMemoListQuery } from '@extension/shared/hooks';

import { getSupabaseClient } from '@src/utils/supabase.client';
import { UseQueryResult } from '@tanstack/react-query';
import { MasonryInfiniteGrid } from '@egjs/react-infinitegrid';
import { useEffect, useState } from 'react';

import { MemoRow, MemoSupabaseResponse } from '@extension/shared/types';

const Item = ({ num }: any) => (
  <div
    style={{
      width: '250px',
    }}>
    <div className="thumbnail">
      <img src={`https://naver.github.io/egjs-infinitegrid/assets/image/${(num % 33) + 1}.jpg`} alt="egjs" />
    </div>
    <div className="info">{`egjs ${num}`}</div>
  </div>
);

function getItems(nextGroupKey: number, count: number) {
  const nextItems = [];
  const nextKey = nextGroupKey * count;

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

  if (!memoList || memoList.length === 0)
    return <p className="text-center mt-8">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>;
  return (
    <MasonryInfiniteGrid
      className="container"
      gap={5}
      onRequestAppend={e => {
        const nextGroupKey = (+e.groupKey! || 0) + 1;
        setItems([...items, ...getItems(nextGroupKey, 10)]);
      }}>
      {items.map(item => (
        <MemoItem data-grid-groupkey={item.groupKey} key={item.key} memo={memoList.at(item.key)} />
      ))}
    </MasonryInfiniteGrid>
  );
}

interface MemoItemProps {
  memo: MemoRow;
}

function MemoItem({ memo }: MemoItemProps) {
  return (
    <div className="bg-base-100 shadow-xl mb-4 card box-border w-[250px]">
      <div className="card-body">
        <p className="font-bold">{memo?.title}</p>
        <p className="whitespace-break-spaces">{memo?.memo}</p>
      </div>
    </div>
  );
}
