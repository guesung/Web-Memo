import { LanguageParams } from '@src/app/i18n/type';
import { Setting, SettingHeader } from './component';

export default function Page({ params: { lng } }: LanguageParams) {
  return (
    <main>
      <SettingHeader lng={lng} />
      <Setting lng={lng} />
    </main>
  );
}
