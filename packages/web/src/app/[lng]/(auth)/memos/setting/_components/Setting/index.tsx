'use client';

import { Loading } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';

import { Suspense } from 'react';
import SettingCategoryForm from './SettingCategoryForm';
import SettingGuide from './SettingGuide';
import SettingLanguage from './SettingLanguage';

interface SettingProps extends LanguageType {}

export default function Setting({ lng }: SettingProps) {
  return (
    <section className="grid gap-6">
      <Suspense fallback={<Loading />}>
        <SettingLanguage lng={lng} />
        <SettingGuide lng={lng} />
        <SettingCategoryForm lng={lng} />
      </Suspense>
    </section>
  );
}
