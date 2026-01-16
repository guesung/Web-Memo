"use client";

import type { LanguageType } from "@src/modules/i18n";
import { Skeleton } from "@web-memo/ui";
import dynamic from "next/dynamic";

import HeaderLeft from "./HeaderLeft";

const HeaderRight = dynamic(() => import("./HeaderRight"), {
	ssr: false,
	loading: () => (
		<div className="flex items-center gap-2">
			<Skeleton className="h-10 w-10 rounded-md" />
			<Skeleton className="h-8 w-8 rounded-full" />
		</div>
	),
});

export default function Header({ lng }: LanguageType) {
	return (
		<header className="bg-background fixed inset-x-0 z-50 flex h-12 flex-1 justify-between p-2 shadow-sm">
			<HeaderLeft lng={lng} />
			<HeaderRight lng={lng} />
		</header>
	);
}

export function HeaderMargin() {
	return <div className="h-16" />;
}
