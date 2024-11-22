'use server';

import useTranslation from '@src/app/i18n/server';
import { LanguageType } from '@src/app/i18n/type';
import { Label } from '@src/components/ui/label';

interface SettingHeaderProps extends LanguageType {}

export default async function SettingHeader({ lng }: SettingHeaderProps) {
  const { t } = await useTranslation(lng);
  return <Label className="flex justify-center py-10 text-xl">{t('setting.header')}</Label>;
}
