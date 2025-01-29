import { I18n } from '@extension/shared/utils/extension';

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/icon-48.png" alt="logo" className="h-8 w-8" />
          <h1 className="text-2xl font-bold text-gray-800">{I18n.get('extensionName')}</h1>
        </div>
      </div>
    </header>
  );
}
