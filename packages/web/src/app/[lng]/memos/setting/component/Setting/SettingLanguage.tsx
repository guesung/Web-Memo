import { Label } from '@src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui/select';
import { useLanguage } from '@src/hooks';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';

interface SettingLanguageProps extends LanguageType {}

export default function SettingLanguage({ lng }: SettingLanguageProps) {
  const { t } = useTranslation(lng);
  const { language, setLanguageRouter } = useLanguage();

  return (
    <div className="grid grid-cols-12">
      <Label className="col-span-4 grid place-items-center">{t('setting.language')}</Label>
      <Select onValueChange={setLanguageRouter} value={language} aria-label={t('setting.selectLanguage')}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ko">한글</SelectItem>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
