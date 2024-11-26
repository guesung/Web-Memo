'use client';

import { EXTENSION } from '@extension/shared/constants';
import useTranslation from '@src/modules/i18n/client';
import { LanguageType } from '@src/modules/i18n';
import { useGetExtensionManifest } from '@src/hooks';

interface ExtensionVersionProps extends LanguageType {}

export default function ExtensionVersion({ lng }: ExtensionVersionProps) {
  const { t } = useTranslation(lng);
  const manifest = useGetExtensionManifest();

  if (!manifest) return;
  return (
    <p className="absolute bottom-2 right-2 w-full text-end text-sm">
      {manifest.version === EXTENSION.lastVersion
        ? t('version.itIsLastVersion')
        : `${t('version.installedVersion')} : ${manifest.version} | ${t('version.lastVersion')} : ${EXTENSION.lastVersion}`}
    </p>
  );
}
