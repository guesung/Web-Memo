'use client';

import { LanguageType } from '@src/modules/i18n';
import { Button } from '@src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { getExtensionDialogInfo } from './getExtensionDialogInfo';
import useExtensionDialog from './useExtensionDialog';
import { checkLocalStorageKey } from '@extension/shared/modules/local-storage';

interface ExtensionDialogProps extends LanguageType {}

export default function ExtensionDialog({ lng }: ExtensionDialogProps) {
  const { open, setOpen, dialogType, manifest, handleClose } = useExtensionDialog();

  const extensionDialogInfo = getExtensionDialogInfo(lng, manifest, dialogType);

  if (!dialogType || !extensionDialogInfo) return null;

  const handleUpdateClick = () => {
    window.open(extensionDialogInfo.link, '_blank', 'noopener,noreferrer');
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
              {extensionDialogInfo.message.cancel}
            </Button>
          )}
          <Button onClick={handleUpdateClick}>{extensionDialogInfo.message.ok}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
