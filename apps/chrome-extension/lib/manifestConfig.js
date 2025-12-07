import { CONFIG } from "@web-memo/env";

export function getExternallyConnectableMatches() {
	const webUrl = CONFIG.webUrl;
	const url = new URL(webUrl);

	if (url.hostname === "localhost") {
		return [`http://localhost:${url.port}/*`, "https://*.webmemo.site/*"];
	}

	const domain = url.hostname.replace(/^www\./, "");
	return [`https://*.${domain}/*`];
}

export function getManifestKey() {
	return (
		CONFIG.extensionKey ||
		"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAob5nrfpKAihURRka74OiALrnMN9aHytr7Ik7vGzbtoVrc6xecQYj+fw1qHfax0gwQi4bql0/Ah3Zb2u7zPmPPvoPStgittQUgg5IVxJIij1cIbRgY+MvQh3z3YU27lA4zANOauhb7Q8Z9ocDr9OoZqX0rBMk9zXSk/UlgDZhRkMuyG8R1DSVUe0qFSIwKFQFMDWp1VmgMR8p9htrhGoOE8kIPxUxKHiVOHw2Dd+u5jASk462HcS7OptLpfAIZsgk/enj0LumPzjANu062ZUBbTUHUzWUL9540UTI6slfuvcjwRKLAtOpg8FN3yaNvCZKOO5Ot9Qy23zZ4LoItHt+TwIDAQAB"
	);
}

export function getOAuth2ClientId() {
	return (
		CONFIG.oauth2ClientId ||
		"541718063018-1or10fljnf26bg8jgd028t509k22ejfi.apps.googleusercontent.com"
	);
}
