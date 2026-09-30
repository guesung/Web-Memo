"use server";

import { HeaderMargin } from "@src/components/Header";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Sidebar, SidebarContent, SidebarSeparator } from "@web-memo/ui";

import SidebarCategorySection from "./SidebarCategorySection";
import SidebarFooterSection from "./SidebarFooterSection";
import SidebarMainSection from "./SidebarMainSection";
import SidebarTrashSection from "./SidebarTrashSection";

/** 메모 도구의 주요 탐색 섹션을 조합하는 사이드바. */
export default async function MemoSidebar({ lng }: LanguageType) {
	const { t } = await useTranslation(lng);

	return (
		<Sidebar className="border-r border-border">
			<HeaderMargin />
			<SidebarContent className="memo-sidebar-content gap-0 bg-sidebar">
				<SidebarMainSection lng={lng} />

				<SidebarSeparator className="mx-0 bg-gradient-to-r from-transparent via-border to-transparent" />

				<SidebarTrashSection lng={lng} label={t("sideBar.trash")} />

				<SidebarSeparator className="mx-0 bg-gradient-to-r from-transparent via-border to-transparent" />

				<SidebarCategorySection lng={lng} />
			</SidebarContent>
			<SidebarFooterSection lng={lng} label={t("sideBar.settings")} />
		</Sidebar>
	);
}
