import { useFeedbackMutation } from '@extension/shared/hooks';
import { toast } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const FeedbackDialog = dynamic(() => import('./FeedbackDialog'), {
  ssr: false,
});

interface FeedbackSectionProps extends LanguageType {}

export const FeedbackSection = ({ lng }: FeedbackSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: mutateFeedback } = useFeedbackMutation();
  const { t } = useTranslation(lng);

  const handleSubmit = (content: string) => {
    setIsOpen(false);
    mutateFeedback({ content });
    toast({
      title: t('feedback.success'),
      description: t('feedback.successDescription'),
    });
  };

  return (
    <section>
      <button
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-foreground text-sm transition-colors">
        {t('feedback.button')}
      </button>
      <FeedbackDialog isOpen={isOpen} onClose={() => setIsOpen(false)} onSubmit={handleSubmit} lng={lng} />
    </section>
  );
};
