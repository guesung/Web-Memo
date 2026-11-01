import type { Language } from "@src/modules/i18n";
import type Link from "next/link";
import type { ComponentProps } from "react";

type TLinkHref = ComponentProps<typeof Link>["href"];

/** 언어가 없는 내부 페이지 주소에 언어 접두사를 붙입니다. */
export function getLocalizedHref(lng: Language, href: TLinkHref): TLinkHref {
	if (typeof href === "string") {
		const match = /^([^?#]*)(.*)$/.exec(href);
		const pathname = match?.[1] ?? "";
		const suffix = match?.[2] ?? "";

		return `${localizePathname(lng, pathname)}${suffix}`;
	}
	if (
		href.protocol ||
		href.host ||
		href.hostname ||
		href.port ||
		href.auth ||
		href.slashes
	) {
		throw new Error("LocalizedLink는 외부 URL 객체를 받지 않습니다.");
	}

	return { ...href, pathname: localizePathname(lng, href.pathname ?? "") };
}

function localizePathname(lng: Language, pathname: string): string {
	if (!pathname.startsWith("/") || pathname.startsWith("//")) {
		throw new Error("LocalizedLink는 내부 페이지의 절대 경로만 받습니다.");
	}
	const normalizedPathname = pathname.replace(/^\/(en|ko)(?=\/|$)/, "");
	if (
		/^\/(?:api(?:\/|$)|auth\/callback(?:-email)?(?:\/|$))/.test(
			normalizedPathname,
		)
	) {
		throw new Error("LocalizedLink는 API 및 인증 콜백 경로를 받지 않습니다.");
	}

	return `/${lng}${normalizedPathname === "/" || normalizedPathname === "" ? "" : normalizedPathname}`;
}
