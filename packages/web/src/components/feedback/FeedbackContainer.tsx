import { useFeedbackMutation } from '@extension/shared/hooks';
import { Button, ErrorBoundary, toast } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const FeedbackModal = dynamic(() => import('./FeedbackModal'), {
  ssr: false,
});

export const FeedbackContainer = ({ lng }: LanguageType) => {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: mutateFeedback } = useFeedbackMutation();
  const { t } = useTranslation(lng);

  const handleSubmit = (content: string) => {
    setIsOpen(false);
    mutateFeedback(
      { content },
      {
        onSuccess: () => {
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
      <button
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        {t('feedback.button')}
      </button>
      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSubmit={handleSubmit} lng={lng} />
    </>
  );
};
