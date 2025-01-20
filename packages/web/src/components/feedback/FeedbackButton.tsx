import { Button } from '@extension/ui';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';

interface FeedbackButtonProps extends LanguageType {
  onClick: () => void;
}

export const FeedbackButton = ({ onClick, lng }: FeedbackButtonProps) => {
  const { t } = useTranslation(lng);

  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="text-muted-foreground hover:text-primary">
      {t('feedback.button')}
    </Button>
  );
};
