import { useFeedbackMutation } from '@extension/shared/hooks';
import { Button, ErrorBoundary, toast } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';

export const FeedbackContainer = ({ lng }: LanguageType) => {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: mutateFeedback, isPending } = useFeedbackMutation();
  const { t } = useTranslation(lng);

  const handleSubmit = (content: string) => {
    mutateFeedback(
      { content },
      {
        onSuccess: () => {
          setIsOpen(false);
          toast({
            title: t('feedback.success'),
            description: t('feedback.successDescription'),
          });
        },
        onError: () => {
          toast({
            title: t('feedback.error'),
            description: t('feedback.errorDescription'),
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-primary">
        {t('feedback.button')}
      </Button>
      <FeedbackModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={handleSubmit}
        isLoading={isPending}
        lng={lng}
      />
    </>
  );
};
