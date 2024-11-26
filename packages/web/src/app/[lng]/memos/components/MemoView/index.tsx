'use client';

import { useMemosQuery } from '@extension/shared/hooks';

import { LanguageType } from '@src/modules/i18n';
import { useSupabaseClient } from '@src/hooks';
import { useGuide } from '../../hooks';
import MemoGrid from './MemoGrid';
import { useSearchParams } from '@src/modules/search-params';

interface MemoViewProps extends LanguageType {}

export default function MemoView({ lng }: MemoViewProps) {
  const searchParams = useSearchParams();
  const supabaseClient = useSupabaseClient();
  const isWish = searchParams.get('isWish') === 'true';
  const category = searchParams.get('category');

  const { memos } = useMemosQuery({
    supabaseClient,
  });

  const filteredMemos = memos
    ?.filter(memo => isWish === !!memo.isWish)
    .filter(memo => (category ? memo.category?.name === category : true));

  useGuide();

  if (!filteredMemos || filteredMemos.length === 0)
    return (
      <p className="mt-8 w-full text-center">아직 저장된 메모가 없어요. 사이드 패널을 열어 메모를 저장해보세요 !</p>
    );
  return <MemoGrid memos={filteredMemos} gridKey={category + isWish} lng={lng} />;
}
