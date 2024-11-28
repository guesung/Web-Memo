'use client';

import { useMemosQuery } from '@extension/shared/hooks';
import { useSearchParams } from '@extension/shared/modules/search-params';
import { useSupabaseClient } from '@src/hooks';
import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';
import { useTranslation } from 'react-i18next';

import MemoGrid from './MemoGrid';

interface MemoViewProps extends LanguageType {}

export default function MemoView({ lng }: MemoViewProps) {
  const { t } = useTranslation(lng);
  const searchParams = useSearchParams();
  const supabaseClient = useSupabaseClient();
  const isWish = searchParams.get('isWish') === 'true';
  const category = searchParams.get('category');

  const { memos } = useMemosQuery({
    supabaseClient,
  });

  useGuide({ lng });

  const filteredMemos = memos
    ?.filter(memo => isWish === !!memo.isWish)
    .filter(memo => (category ? memo.category?.name === category : true));

  if (!filteredMemos || filteredMemos.length === 0)
    return <p className="mt-8 w-full text-center">{t('memos.emptyState.message')}</p>;
  return <MemoGrid memos={filteredMemos} gridKey={category + isWish} lng={lng} />;
}
