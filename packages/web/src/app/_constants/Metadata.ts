import type { Metadata } from 'next';

export const metadataKorean: Metadata = {
  title: '웹 메모',
  description:
    '웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: '웹 메모',
    description:
      '웹 메모는 웹페이지를 쉽게 저장하고 관리할 수 있는 서비스입니다. 중요한 웹페이지를 효율적으로 정리하고 필요할 때 빠르게 찾아보세요.',
    locale: 'ko_KR',
    siteName: '웹 메모',
  },
};

export const metadataEnglish: Metadata = {
  title: 'Web Memo',
  description:
    'Web Memo is a service that helps you save and manage web pages efficiently. Organize important web pages and find them quickly when needed.',

  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: 'Web Memo',
    description:
      'Web Memo is a service that helps you save and manage web pages efficiently. Organize important web pages and find them quickly when needed.',
    locale: 'en_US',
    siteName: 'Web Memo',
  },
};
