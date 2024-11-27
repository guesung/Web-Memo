import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/server';

interface PersonalInformationInfoProps extends LanguageType {}

export default async function PersonalInformationInfo({ lng }: PersonalInformationInfoProps) {
  const { t } = await useTranslation(lng);
  return (
    <footer className="absolute inset-x-0 bottom-4 text-center text-sm">
      <p>{t('login.personalInformationInfo')}</p>
    </footer>
  );
}
