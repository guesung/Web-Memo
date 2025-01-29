import type { Language } from '@src/modules/i18n';
import { DEFAULT_LANGUAGE } from '@src/modules/i18n';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const REGEXR_PATHNAME_WITHOUT_LANGUAGE = /^\/\w+(.+)/;
const REGEXR_PATHNAME_LANGAUGE = /^\/(\w+)\/.+/;

export default function useLanguage() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const pathnameLanguage = pathname.match(REGEXR_PATHNAME_LANGAUGE)?.[1];

    if (!pathnameLanguage) return;

    setLanguage(pathnameLanguage as Language);
  }, [pathname]);

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
