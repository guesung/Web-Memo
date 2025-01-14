import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Textarea } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';

interface FeedbackModalProps extends LanguageType {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
}

export default function FeedbackModal({ isOpen, onClose, onSubmit, lng }: FeedbackModalProps) {
  const [content, setContent] = useState('');
  const { t } = useTranslation(lng);

  const handleSubmit = () => {
    onSubmit(content);
    setContent('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('feedback.title')}</DialogTitle>
          <DialogDescription>{t('feedback.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={t('feedback.placeholder')}
            className="min-h-[100px]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t('feedback.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!content}>
            {t('feedback.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
