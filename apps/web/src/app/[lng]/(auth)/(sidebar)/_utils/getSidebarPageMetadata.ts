import type { LanguageParams } from "@src/modules/i18n";
import getTranslation from "@src/modules/i18n/util.server";
import type { Metadata } from "next";

/** 기존 사이드바 번역을 사용해 지정한 라우트의 브라우저 제목을 만든다. */
export async function getSidebarPageMetadata({
	params,
	labelKey,
}: SidebarPageMetadataArgs): Promise<Metadata> {
	const { lng } = await params;
	const { t } = await getTranslation(lng);

	return createSidebarPageMetadata({
		brand: t("common.webMemo"),
		label: t(labelKey),
	});
}

/** 브랜드와 라우트 이름을 결합한다. */
export function createSidebarPageMetadata({
	brand,
	label,
}: SidebarTitle): Metadata {
	return { title: `${brand} | ${label}` };
}

type SidebarPageLabelKey =
	| "sideBar.memo"
	| "sideBar.wishList"
	| "sideBar.importantMemo"
	| "sideBar.readingMemo"
	| "sideBar.highlight";

interface SidebarPageMetadataArgs {
	params: LanguageParams["params"];
	labelKey: SidebarPageLabelKey;
}

interface SidebarTitle {
	brand: string;
	label: string;
}
