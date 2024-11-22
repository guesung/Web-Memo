'use client';

import { URL_CHROME_STORE } from '@extension/shared/constants';
import useTranslation from '@src/app/i18n/client';
import { LanguageType } from '@src/app/i18n/type';
import { useGetExtensionManifest } from '@src/hooks';
import { useEffect } from 'react';

interface ExtensionVersionProps extends LanguageType {}

export default function ExtensionVersion({ lng }: ExtensionVersionProps) {
  const { t } = useTranslation(lng);
  const manifest = useGetExtensionManifest();

  if (!manifest) return;
  return (
    <p className="absolute bottom-2 right-2 w-full text-end text-sm">
      {t('login.installedVersion')} : {manifest.version}
    </p>
  );
}
