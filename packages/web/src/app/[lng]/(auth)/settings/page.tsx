import type { LanguageType } from '@src/modules/i18n';

import CategoryColorSettings from './_components/CategoryColorSettings';

export default function SettingsPage({ lng }: LanguageType) {
  return (
    <div className="space-y-6">
      <CategoryColorSettings lng={lng} />
    </div>
  );
}
