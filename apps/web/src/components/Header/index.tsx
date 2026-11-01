"use client";

import type { LanguageType } from "@src/modules/i18n";
import { Skeleton } from "@web-memo/ui";
import dynamic from "next/dynamic";

import HeaderLeft from "./HeaderLeft";

const HEADER_HEIGHT_CLASS = "h-12";

const HeaderRight = dynamic(() => import("./HeaderRight"), {
	ssr: false,
	loading: () => (
		<div className="flex items-center gap-2">
			<Skeleton className="h-10 w-10 rounded-md" />
			<Skeleton className="h-8 w-8 rounded-full" />
		</div>
	),
});

/** 모든 웹 화면에 공통으로 표시하는 고정 헤더. */
const Header = ({ lng }: LanguageType) => {
	return (
		<header
			className={`bg-background fixed inset-x-0 z-50 flex ${HEADER_HEIGHT_CLASS} flex-1 justify-between p-2 shadow-sm`}
		>
			<HeaderLeft lng={lng} />
			<HeaderRight lng={lng} />
		</header>
	);
};

/** 고정 헤더와 같은 높이의 문서 여백. */
export const HeaderMargin = () => (
	<div className={`${HEADER_HEIGHT_CLASS} shrink-0`} />
);

export default Header;
