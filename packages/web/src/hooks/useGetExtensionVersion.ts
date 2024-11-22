import { URL_CHROME_STORE } from '@extension/shared/constants';
import { useDidMount } from '@extension/shared/hooks';
import { requestGetExtensionManifest } from '@extension/shared/utils/extension';
import useTranslation from '@src/app/i18n/client';
import { LanguageType } from '@src/app/i18n/type';
import { useState } from 'react';

interface UseGetExtensionVersionPropd extends LanguageType {}

export default function useGetExtensionVersion({ lng }: UseGetExtensionVersionPropd) {
  const [version, setVersion] = useState<null | string>(null);
  const { t } = useTranslation(lng);

  useDidMount(() => {
    try {
      requestGetExtensionManifest(({ version }) => setVersion(version));
    } catch (e) {
      const answer = window.confirm(t('login.askGoInstallExtension'));
      if (!answer) return;
      location.href = URL_CHROME_STORE;
    }
  });

  return { version };
}
