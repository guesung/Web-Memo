import { LanguageParams } from '@src/modules/i18n';

import { Setting, SettingHeader } from './component';

export default function Page({ params: { lng } }: LanguageParams) {
  return (
    <main>
      <SettingHeader lng={lng} />
      <Setting lng={lng} />
    </main>
  );
}
