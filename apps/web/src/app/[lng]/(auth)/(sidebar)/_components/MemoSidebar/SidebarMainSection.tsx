import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { PATHS } from "@web-memo/shared/constants";
import { SidebarGroup, SidebarMenu } from "@web-memo/ui";
import {
	BookOpen,
	Heart,
	Highlighter,
	Home,
	LibraryBig,
	Star,
} from "lucide-react";

import SidebarNavItem from "./SidebarNavItem";

/** 메모 종류별 탐색 항목을 표시하는 섹션. */
const SidebarMainSection = async ({ lng }: LanguageType) => {
	const { t } = await useTranslation(lng);
	const withLanguage = (path: string) => `/${lng}${path}`;

	return (
		<SidebarGroup className="p-0">
			<SidebarMenu className="gap-0">
				<SidebarNavItem
					href={withLanguage(PATHS.memos)}
					label={t("sideBar.memo")}
					icon={<Home size={16} className="text-primary" />}
					iconChipClassName="bg-primary/10 group-hover:bg-primary/20"
				/>
				<SidebarNavItem
					href={withLanguage(PATHS.memosWish)}
					label={t("sideBar.wishList")}
					icon={
						<Heart size={16} className="text-pink-600 dark:text-pink-400" />
					}
					iconChipClassName="bg-pink-100 dark:bg-pink-900/30 group-hover:bg-pink-200 dark:group-hover:bg-pink-800/40"
				/>
				<SidebarNavItem
					href={withLanguage(PATHS.memosStar)}
					label={t("sideBar.importantMemo")}
					icon={
						<Star size={16} className="text-amber-600 dark:text-amber-400" />
					}
					iconChipClassName="bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40"
				/>
				<SidebarNavItem
					href={withLanguage(PATHS.memosReading)}
					label={t("sideBar.readingMemo")}
					icon={
						<BookOpen
							size={16}
							className="text-emerald-600 dark:text-emerald-400"
						/>
					}
					iconChipClassName="bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/40"
				/>
				<SidebarNavItem
					href={withLanguage(PATHS.memosBlogs)}
					label={t("sideBar.blogReading")}
					icon={
						<LibraryBig
							size={16}
							className="text-violet-600 dark:text-violet-400"
						/>
					}
					iconChipClassName="bg-violet-100 dark:bg-violet-900/30 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/40"
				/>
				<SidebarNavItem
					href={withLanguage(PATHS.highlights)}
					label={t("sideBar.highlight")}
					icon={
						<Highlighter
							size={16}
							className="text-amber-600 dark:text-amber-400"
						/>
					}
					iconChipClassName="bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40"
				/>
			</SidebarMenu>
		</SidebarGroup>
	);
};

export default SidebarMainSection;
