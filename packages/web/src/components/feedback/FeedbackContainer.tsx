import { useState } from 'react';
import { FeedbackButton } from './FeedbackButton';
import { FeedbackModal } from './FeedbackModal';
import { Button, ErrorBoundary, toast } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useFeedbackMutation } from '@extension/shared/hooks';

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};
