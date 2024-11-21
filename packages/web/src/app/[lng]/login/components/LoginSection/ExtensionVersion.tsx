'use client';

import { URL_CHROME_STORE } from '@extension/shared/constants';
import { useDidMount } from '@extension/shared/hooks';
import { requestGetExtensionManifest } from '@extension/shared/utils/extension';
import useTranslation from '@src/app/i18n/client';
import { LanguageType } from '@src/app/i18n/type';
import { useState } from 'react';

interface ExtensionVersionProps extends LanguageType {}

export default function ExtensionVersion({ lng }: ExtensionVersionProps) {
  const [version, setVersion] = useState<null | string>(null);
  const { t } = useTranslation(lng);

  useDidMount(() => {
    try {
      requestGetExtensionManifest(manifest => {
        setVersion(manifest.version);
      });
    } catch (e) {
      const answer = window.confirm(t('login.askGoInstallExtension'));
      if (!answer) return;
      location.href = URL_CHROME_STORE;
    }
  });

  if (version)
    return (
      <p className="absolute bottom-2 right-2 w-full text-end text-sm">
        {t('login.installedVersion')} : {version}
      </p>
    );
  return;
}
