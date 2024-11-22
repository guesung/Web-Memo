'use client';

import useTranslation from '@src/app/i18n/client';
import { Language, LanguageType } from '@src/app/i18n/type';
import { Label } from '@src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui/select';
import { useLanguage } from '@src/hooks';

interface SettingProps extends LanguageType {}

export default function Setting({ lng }: SettingProps) {
  const { t } = useTranslation(lng);
  const { language, setLanguageRouter } = useLanguage();

  return (
    <section className="grid gap-6">
      <div className="grid grid-cols-12">
        <Label className="col-span-4 grid place-items-center">{t('setting.language')}</Label>
        <Select onValueChange={setLanguageRouter} value={language}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ko">한글</SelectItem>
            <SelectItem value="en">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
