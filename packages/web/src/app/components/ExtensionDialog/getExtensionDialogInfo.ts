import { EXTENSION, URL } from '@extension/shared/constants';
import useTranslation from '@src/app/i18n/client';
import { Language } from '@src/app/i18n/type';
import { LOCAL_STORAGE_KEY_MAP } from '@src/utils';
import useExtensionDialog, { DialogType } from './useExtensionDialog';

export const getExtensionDialogInfo = (
  lng: Language,
  manifest: ReturnType<typeof useExtensionDialog>['manifest'],
  dialogType?: DialogType,
) => {
  const { t } = useTranslation(lng);

  if (!dialogType) return;

  const EXTENSION_DIALOG_INFO_ALL = {
    install: {
      message: {
        title: t('dialogInstall.title'),
        description: t('dialogInstall.description'),
        ok: t('dialogInstall.ok'),
        cancel: t('dialogInstall.cancel'),
      },
      link: URL.chromeStore,
      localStorageKey: LOCAL_STORAGE_KEY_MAP.install,
    },
    update: {
      message: {
        title: t('dialogVersion.title'),
        description: t('dialogVersion.description', {
          currentVersion: manifest?.version,
          lastVersion: EXTENSION.lastVersion,
        }),
        ok: t('dialogVersion.ok'),
        cancel: t('dialogVersion.cancel'),
      },
      link: URL.guideKo,
      localStorageKey: LOCAL_STORAGE_KEY_MAP.updateVersion,
    },
  };
  return EXTENSION_DIALOG_INFO_ALL[dialogType];
};
