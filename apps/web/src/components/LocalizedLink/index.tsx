import type { Language } from "@src/modules/i18n";
import Link from "next/link";
import type { ComponentProps } from "react";
import { getLocalizedHref } from "./getLocalizedHref";

/** 언어별 내부 페이지로 이동하면서 Next Link의 속성과 ref를 그대로 전달합니다. */
export default function LocalizedLink({
	lng,
	href,
	...props
}: ComponentProps<typeof Link> & { lng: Language }) {
	return <Link {...props} href={getLocalizedHref(lng, href)} />;
}
