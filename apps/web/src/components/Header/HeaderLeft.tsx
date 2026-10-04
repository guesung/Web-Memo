"use client";

import LocalizedLink from "@src/components/LocalizedLink";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import Image from "next/image";

import { FeedbackSection } from "./FeedbackSection";

/** 메모 목록으로 이동하는 헤더 브랜드 링크를 표시합니다. */
const HeaderLeft = ({ lng }: LanguageType) => {
	const { t } = useTranslation(lng);

	return (
		<div className="flex flex-1 items-center gap-2 whitespace-nowrap sm:gap-4">
			<LocalizedLink lng={lng} href={PATHS.memos}>
				<div className="flex h-full items-center gap-2 px-2 sm:px-4">
					<Image
						src="/images/pngs/icon.png"
						width={16}
						height={16}
						alt="logo"
						className="flex-1"
					/>
					<span className="text-md font-semibold">{t("common.webMemo")}</span>
				</div>
			</LocalizedLink>
			<LocalizedLink
				lng={lng}
				href={PATHS.introduce}
				className="text-muted-foreground hover:text-foreground text-sm transition-colors"
			>
				{t("header.introduce")}
			</LocalizedLink>
			<FeedbackSection lng={lng} />
		</div>
	);
};

export default HeaderLeft;
