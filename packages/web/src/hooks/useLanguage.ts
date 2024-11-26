import { fallbackLng } from '@src/modules/i18n';
import { Language } from '@src/modules/i18n';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const REGEXR_PATHNAME_WITHOUT_LANGUAGE = /^\/\w+(.+)/;
const REGEXR_PATHNAME_LANGAUGE = /^\/(\w+)\/.+/;

export default function useLanguage() {
  const [language, setLanguage] = useState<Language>(fallbackLng);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const pathnameLanguage = pathname.match(REGEXR_PATHNAME_LANGAUGE)?.[1];

    if (!pathnameLanguage) return;

    setLanguage(pathnameLanguage as Language);
  }, []);

  const setLanguageRouter = (value: Language) => {
    const pathnameWithoutLanguage = pathname.match(REGEXR_PATHNAME_WITHOUT_LANGUAGE)?.[1];

    if (!pathnameWithoutLanguage) return;

    router.push(`/${value}${pathnameWithoutLanguage}`);
  };

  return {
    language,
    setLanguageRouter,
  };
}
