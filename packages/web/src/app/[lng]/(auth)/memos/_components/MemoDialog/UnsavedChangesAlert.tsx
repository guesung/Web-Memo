import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@src/components/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';

interface UnsavedChangesAlertProps extends LanguageType {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function UnsavedChangesAlert({ open, onClose, onSave, lng }: UnsavedChangesAlertProps) {
  const { t } = useTranslation(lng);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogTitle>{t('dialogUnsavedChanges.title')}</AlertDialogTitle>
        <AlertDialogDescription>{t('dialogUnsavedChanges.description')}</AlertDialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <AlertDialogCancel onClick={onClose}>{t('dialogUnsavedChanges.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onSave}>{t('dialogUnsavedChanges.ok')}</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
