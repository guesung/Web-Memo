"use server";

import { HeaderMargin } from "@src/components/Header";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { PATHS } from "@web-memo/shared/constants";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarSeparator,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-memo/ui";
import {
	BookOpen,
	Heart,
	Highlighter,
	Home,
	SettingsIcon,
	Star,
	Trash2,
} from "lucide-react";
import Link from "next/link";

import SidebarGroupCategory from "./SidebarGroupCategory";
import SidebarNavItem from "./SidebarNavItem";

export default async function MemoSidebar({ lng }: LanguageType) {
	const { t } = await useTranslation(lng);

	// href에 lng를 붙이지 않으면 i18n 미들웨어가 307로 리다이렉트하고,
	// Next는 리다이렉트된 RSC 요청을 클라이언트 네비게이션으로 잇지 못해
	// 전체 페이지를 다시 받는다.
	const withLanguage = (path: string) => `/${lng}${path}`;

	return (
		<Sidebar className="border-r border-border">
			<HeaderMargin />
			<SidebarContent className="bg-sidebar">
				<SidebarGroup className="pt-4">
					<SidebarMenu className="space-y-1">
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
								<Star
									size={16}
									className="text-amber-600 dark:text-amber-400"
								/>
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

				{/* 휴지통은 메모를 훑는 탭이 아니라 되돌리는 자리라 구분선 아래로 내린다 */}
				<SidebarSeparator className="my-2 bg-gradient-to-r from-transparent via-border to-transparent" />
				<SidebarGroup className="py-0">
					<SidebarMenu>
						<SidebarNavItem
							href={withLanguage(PATHS.memosTrash)}
							label={t("sideBar.trash")}
							icon={<Trash2 size={16} className="text-muted-foreground" />}
							iconChipClassName="bg-foreground/5 group-hover:bg-foreground/10"
						/>
					</SidebarMenu>
				</SidebarGroup>

				<SidebarSeparator className="my-4 bg-gradient-to-r from-transparent via-border to-transparent" />
				<SidebarGroupCategory lng={lng} />
			</SidebarContent>
			<SidebarFooter className="border-t border-border bg-sidebar-accent p-3">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Link href={withLanguage(PATHS.memosSetting)}>
								<SidebarMenuButton
									id="settings"
									className="group w-full justify-center hover:bg-accent hover:shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
								>
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
										<SettingsIcon
											size={16}
											className="text-blue-600 dark:text-blue-400"
										/>
									</div>
								</SidebarMenuButton>
							</Link>
						</TooltipTrigger>
						<TooltipContent
							side="right"
							className="bg-foreground text-background border-border"
						>
							<p>{t("sideBar.settings")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</SidebarFooter>
		</Sidebar>
	);
}
