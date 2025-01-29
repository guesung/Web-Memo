'use client';

import { PATHS } from '@extension/shared/constants';
import type { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import Image from 'next/image';
import Link from 'next/link';

import { FeedbackSection } from './FeedbackSection';

export default function HeaderLeft({ lng }: LanguageType) {
  const { t } = useTranslation(lng);

  return (
    <div className="flex flex-1 items-center gap-4">
      <Link href={PATHS.memos}>
        <div className="flex h-full items-center gap-2 px-4">
          <Image src="/images/pngs/icon.png" width={16} height={16} alt="logo" className="flex-1" />
          <span className="text-md font-semibold">{t('common.webMemo')}</span>
        </div>
      </Link>
      <Link href={PATHS.introduce} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        {t('header.introduce')}
      </Link>
      <Link href={PATHS.update} className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        {t('header.update')}
      </Link>
      <FeedbackSection lng={lng} />
    </div>
  );
}
