"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { FeedbackSection } from "./FeedbackSection";

/** 현재 화면의 성격에 맞는 헤더 브랜드 링크를 표시합니다. */
const HeaderLeft = ({ lng }: LanguageType) => {
	const { t } = useTranslation(lng);
	const pathname = usePathname();
	const brandHref = isPublicIndexPath(pathname, lng)
		? `/${lng}${PATHS.introduce}`
		: `/${lng}${PATHS.memos}`;

	return (
		<div className="flex flex-1 items-center gap-4">
			<Link href={brandHref}>
				<div className="flex h-full items-center gap-2 px-4">
					<Image
						src="/images/pngs/icon.png"
						width={16}
						height={16}
						alt=""
						className="flex-1"
					/>
					<span className="text-md font-semibold">{t("common.webMemo")}</span>
				</div>
			</Link>
			<Link
				href={`/${lng}${PATHS.introduce}`}
				className="text-muted-foreground hover:text-foreground text-sm transition-colors"
			>
				{t("header.introduce")}
			</Link>
			<FeedbackSection lng={lng} />
		</div>
	);
};

export default HeaderLeft;

/** 검색 엔진에 공개되는 현재 경로인지 판별합니다. */
const isPublicIndexPath = (pathname: string, lng: LanguageType["lng"]) => {
	const localizedPathPrefix = `/${lng}`;

	if (
		pathname === `${localizedPathPrefix}${PATHS.introduce}` ||
		pathname === `${localizedPathPrefix}${PATHS.privacy}`
	) {
		return true;
	}

	return (
		pathname.startsWith(`${localizedPathPrefix}/features/`) ||
		pathname.startsWith(`${localizedPathPrefix}/use-cases/`) ||
		pathname.startsWith(`${localizedPathPrefix}/compare/`)
	);
};
