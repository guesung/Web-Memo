import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@extension/ui';
import type { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';

interface UnsavedChangesAlertProps extends LanguageType {
  open: boolean;
  onOk: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesAlert({ open, onOk, onCancel, lng }: UnsavedChangesAlertProps) {
  const { t } = useTranslation(lng);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogTitle>{t('dialogUnsavedChanges.title')}</AlertDialogTitle>
        <AlertDialogDescription>{t('dialogUnsavedChanges.description')}</AlertDialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <AlertDialogCancel onClick={onCancel}>{t('dialogUnsavedChanges.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onOk}>{t('dialogUnsavedChanges.ok')}</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
