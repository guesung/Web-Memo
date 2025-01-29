import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui';
import { useLanguage } from '@src/hooks';
import { Language, LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import { useRouter } from 'next/navigation';

interface SettingLanguageProps extends LanguageType {}

export default function SettingLanguage({ lng }: SettingLanguageProps) {
  const { t } = useTranslation(lng);
  const { language, setLanguageRouter } = useLanguage();
  const router = useRouter();

  const handleChangeLanguage = (value: Language) => {
    setLanguageRouter(value);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-12">
      <Label className="col-span-4 grid place-items-center">{t('setting.language')}</Label>
      <Select onValueChange={handleChangeLanguage} value={language} aria-label={t('setting.selectLanguage')}>
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
