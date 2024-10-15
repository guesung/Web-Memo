'use client';

import { URL_CHROME_STORE } from '@extension/shared/constants';
import { useDidMount } from '@extension/shared/hooks';
import { requestGetExtensionManifest } from '@extension/shared/utils/extension';
import { useState } from 'react';

export default function ExtensionVersion() {
  const [version, setVersion] = useState<null | string>(null);

  useDidMount(() => {
    try {
      requestGetExtensionManifest(manifest => {
        setVersion(manifest.version);
      });
    } catch (e) {
      const answer = window.confirm(
        '익스텐션을 설치하지 않으셨군요. 설치해야 메모 기능을 이용하실 수 있습니다. 설치하러 가시겠습니까?',
      );
      if (!answer) return;
      location.href = URL_CHROME_STORE;
    }
  });

  if (version)
    return <p className="w-full text-sm absolute right-2 bottom-2 text-gray-600 text-end">설치된 버전 : {version}</p>;
  return;
}
