import { useState } from 'react';
import { FeedbackButton } from './FeedbackButton';
import { FeedbackModal } from './FeedbackModal';
import { ErrorBoundary, toast } from '@extension/ui';
import { useFeedback } from '@src/hooks/useFeedback';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';

export const FeedbackContainer = ({ lng }: LanguageType) => {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: createFeedback, isPending } = useFeedback();
  const { t } = useTranslation(lng);

  const handleSubmit = (content: string) => {
    createFeedback(
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
      <FeedbackButton onClick={() => setIsOpen(true)} lng={lng} />
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
