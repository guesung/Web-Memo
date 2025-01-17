import { EXTENSION, URL } from '@extension/shared/constants';
import { LocalStorageKeyType } from '@extension/shared/modules/local-storage';
import { Language } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';

import useExtensionDialog, { DialogType } from './useExtensionDialog';

interface ExtensionDialogInfo {
  message: {
    title: string;
    description: string;
    ok: string;
    cancel?: string;
  };
  link: string;
  localStorageKey: LocalStorageKeyType;
}

export const useExtensionDialogInfo = (
  lng: Language,
  manifest: ReturnType<typeof useExtensionDialog>['manifest'],
  dialogType?: DialogType,
) => {
  const { t } = useTranslation(lng);

  if (!dialogType) return;

  const EXTENSION_DIALOG_INFO_ALL: Record<DialogType, ExtensionDialogInfo> = {
    install: {
      message: {
        title: t('dialogInstall.title'),
        description: t('dialogInstall.description'),
        ok: t('dialogInstall.ok'),
        cancel: t('dialogInstall.cancel'),
      },
      link: URL.chromeStore,
      localStorageKey: 'install',
    },
    // update: {
    //   message: {
    //     title: t('dialogVersion.title'),
    //     description: t('dialogVersion.description', {
    //       currentVersion: manifest?.version,
    //       lastVersion: EXTENSION.lastVersion,
    //     }),
    //     ok: t('dialogVersion.ok'),
    //     cancel: t('dialogVersion.cancel'),
    //   },
    //   link: URL.guideKo,
    //   localStorageKey: 'updateVersion',
    // },
  };
  return EXTENSION_DIALOG_INFO_ALL[dialogType];
};
