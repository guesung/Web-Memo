'use client';

import { useEffect } from 'react';
import NotFoundPresenter from './NotFoundPresenter';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageType } from '@src/modules/i18n';

interface NotFoundContainerProps extends LanguageType {}

const NotFoundContainer = ({ lng }: NotFoundContainerProps) => {
  const pathname = usePathname();

  useEffect(() => {
    // 404 에러 로깅
    console.error(`404 Error: Path "${pathname}" not found`);

    // 애널리틱스 이벤트 트래킹
    // analytics.track('404_error_encountered', {
    //   path: location.pathname,
    //   referrer: document.referrer,
    //   timestamp: new Date().toISOString(),
    // });
  }, []);

  return <NotFoundPresenter lng={lng} />;
};

export default NotFoundContainer;
