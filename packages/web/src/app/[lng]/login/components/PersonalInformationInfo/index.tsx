import useTranslation from '@src/app/i18n/server';
import { LanguageType } from '@src/app/i18n/type';

interface PersonalInformationInfoProps extends LanguageType {}

export default async function PersonalInformationInfo({ lng }: PersonalInformationInfoProps) {
  const { t } = await useTranslation(lng);
  return (
    <footer className="absolute inset-x-0 bottom-4 text-center text-sm">
      <p>{t('login.personalInformationInfo')}</p>
    </footer>
  );
}
