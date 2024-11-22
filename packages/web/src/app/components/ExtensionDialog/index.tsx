'use client';

import { LanguageType } from '@src/app/i18n/type';
import { Button } from '@src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { checkUpdateVersion, LocalStorage } from '@src/utils';
import { getExtensionDialogInfo } from './getExtensionDialogInfo';
import useExtensionDialog from './useExtensionDialog';

interface ExtensionDialogProps extends LanguageType {}

export default function ExtensionDialog({ lng }: ExtensionDialogProps) {
  const { open, setOpen, dialogType, manifest, handleClose } = useExtensionDialog();

  if (!dialogType) return;

  const extensionDialogInfo = getExtensionDialogInfo(lng, manifest, dialogType);

  const handleUpdateClick = () => {
    window.open(extensionDialogInfo.link, '_blank');
    handleClose(extensionDialogInfo.localStorageKey);
  };

  const handleCloseClick = () => {
    handleClose(extensionDialogInfo.localStorageKey);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{extensionDialogInfo.message.title}</DialogTitle>
          <DialogDescription>{extensionDialogInfo.message.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {extensionDialogInfo.message.cancel && (
            <Button onClick={handleCloseClick} variant="secondary">
              {extensionDialogInfo.message?.cancel}
            </Button>
          )}
          <Button onClick={handleUpdateClick}>{extensionDialogInfo.message.ok}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
