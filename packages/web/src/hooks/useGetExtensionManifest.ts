import { useDidMount } from '@extension/shared/hooks';
import { requestGetExtensionManifest } from '@extension/shared/utils/extension';
import { useState } from 'react';

export default function useGetExtensionManifest() {
  const [manifest, setManifest] = useState<chrome.runtime.Manifest | undefined | null>(null);

  useDidMount(() => {
    try {
      requestGetExtensionManifest(manifest => setManifest(manifest));
    } catch (e) {
      setManifest(undefined);
    }
  });

  return manifest;
}
