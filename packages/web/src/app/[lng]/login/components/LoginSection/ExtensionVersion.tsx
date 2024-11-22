'use client';

import { URL_CHROME_STORE } from '@extension/shared/constants';
import { useDidMount } from '@extension/shared/hooks';
import { requestGetExtensionManifest } from '@extension/shared/utils/extension';
import useTranslation from '@src/app/i18n/client';
import { LanguageType } from '@src/app/i18n/type';
import { useGetExtensionVersion } from '@src/hooks';
import { useState } from 'react';

interface ExtensionVersionProps extends LanguageType {}

export default function ExtensionVersion({ lng }: ExtensionVersionProps) {
  const { t } = useTranslation(lng);
  const { version } = useGetExtensionVersion({ lng });

  if (version)
    return (
      <p className="absolute bottom-2 right-2 w-full text-end text-sm">
        {t('login.installedVersion')} : {version}
      </p>
    );
  return;
}
