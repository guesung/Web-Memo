import { useDidMount } from "@extension/shared/hooks";
import { ExtensionBridge } from "@extension/shared/modules/extension-bridge";
import { useState } from "react";

export type ManifestType = chrome.runtime.Manifest | null | "NOT_INSTALLED";

export default function useGetExtensionManifest() {
	const [manifest, setManifest] = useState<ManifestType>(null);

	useDidMount(async () => {
		try {
			await ExtensionBridge.requestGetExtensionManifest((manifest) =>
				setManifest(manifest),
			);
		} catch {
			setManifest("NOT_INSTALLED");
		}
	});

	return manifest;
}
