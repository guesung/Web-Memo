import { useDidMount } from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { useState } from "react";

export type ManifestType = chrome.runtime.Manifest | null | "NOT_INSTALLED";

export default function useGetExtensionManifest() {
	const [manifest, setManifest] = useState<ManifestType>(null);

	useDidMount(async () => {
		try {
			const result = await bridge.request.GET_EXTENSION_MANIFEST();
			setManifest(result);
		} catch {
			setManifest("NOT_INSTALLED");
		}
	});

	return manifest;
}
