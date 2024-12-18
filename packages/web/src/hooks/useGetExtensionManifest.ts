import { useDidMount } from '@extension/shared/hooks';
import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import { useState } from 'react';

export default function useGetExtensionManifest() {
  const [manifest, setManifest] = useState<chrome.runtime.Manifest | undefined | null>(null);

  useDidMount(() => {
    try {
      ExtensionBridge.requestGetExtensionManifest(manifest => setManifest(manifest));
    } catch (e) {
      setManifest(undefined);
    }
  });

  return manifest;
}
