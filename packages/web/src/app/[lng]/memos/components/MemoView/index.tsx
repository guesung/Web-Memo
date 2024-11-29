'use client';

import { useMemosQuery } from '@extension/shared/hooks';
import { useSupabaseClient } from '@src/hooks';
import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';
import { useTranslation } from 'react-i18next';

import MemoGrid from './MemoGrid';

interface MemoViewProps extends LanguageType {
  isWish?: string;
  category?: string;
}

export default function MemoView({ lng, isWish = '', category = '' }: MemoViewProps) {
  const { t } = useTranslation(lng);
  const supabaseClient = useSupabaseClient();

  const { memos } = useMemosQuery({
    supabaseClient,
  });

  useGuide({ lng });

  const filteredMemos = memos
    ?.filter(memo => !!isWish === !!memo.isWish)
    .filter(memo => (category ? memo.category?.name === category : true));

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {category && `${category} | `}
        {t('memos.totalMemos', { total: filteredMemos.length })}
      </p>
      <MemoGrid memos={filteredMemos} gridKey={category + isWish} lng={lng} />
    </div>
  );
}
