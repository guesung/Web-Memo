import { EXTENSION, URL_CHROME_STORE, URL_GUIDE_KO } from '@extension/shared/constants';
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
        description: t('dialogInstall.title'),
        ok: t('dialogInstall.ok'),
        cancel: t('dialogInstall.cancel'),
      },
      link: URL_CHROME_STORE,
      localStorageKey: LOCAL_STORAGE_KEY_MAP.install,
    },
    update: {
      message: {
        title: t('dialogVersion.title'),
        description: t('dialogVersion.description', {
          currentVersion: manifest?.version,
          lastVersion: EXTENSION.lastVersion,
        }),
        cancel: t('dialogVersion.cancel'),
        ok: t('dialogVersion.ok'),
      },
      link: URL_GUIDE_KO,
      localStorageKey: LOCAL_STORAGE_KEY_MAP.updateVersion + 'a',
    },
  };
  return EXTENSION_DIALOG_INFO_ALL[dialogType];
};
