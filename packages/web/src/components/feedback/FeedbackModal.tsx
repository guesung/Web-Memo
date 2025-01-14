import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Textarea } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useForm } from 'react-hook-form';

interface FeedbackModalProps extends LanguageType {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
}

export default function FeedbackModal({ isOpen, onClose, onSubmit, lng }: FeedbackModalProps) {
  const { t } = useTranslation(lng);
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      content: '',
    },
  });

  const onSubmitHandler = handleSubmit(data => {
    onSubmit(data.content);
    reset();
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('feedback.title')}</DialogTitle>
          <DialogDescription>{t('feedback.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmitHandler} className="space-y-4">
          <div className="grid gap-2">
            <Textarea {...register('content')} placeholder={t('feedback.placeholder')} className="min-h-[100px]" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('feedback.cancel')}
            </Button>
            <Button type="submit" disabled={watch('content').length === 0}>
              {t('feedback.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}