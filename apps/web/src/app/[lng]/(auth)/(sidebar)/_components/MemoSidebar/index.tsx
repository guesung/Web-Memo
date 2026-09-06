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

export default async function MemoSidebar({ lng }: LanguageType) {
	const { t } = await useTranslation(lng);

	return (
		<Sidebar className="border-r border-border">
			<HeaderMargin />
			<SidebarContent className="bg-sidebar">
				<SidebarGroup className="pt-4">
					<SidebarMenu className="space-y-1">
						{/* href에 lng를 붙이지 않으면 i18n 미들웨어가 307로 리다이렉트하고,
						    Next는 리다이렉트된 RSC 요청을 클라이언트 네비게이션으로 잇지 못해
						    전체 페이지를 다시 받는다. */}
						<Link href={`/${lng}${PATHS.memos}`} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-primary/5 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
										<Home size={16} className="text-primary" />
									</div>
									<span className="font-medium text-foreground group-hover:text-primary">
										{t("sideBar.memo")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
						<Link href={`/${lng}${PATHS.memos}?isWish=true`} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-gradient-to-r hover:from-pink-50 hover:to-pink-100/50 dark:hover:from-pink-950/30 dark:hover:to-pink-900/20 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 group-hover:bg-pink-200 dark:group-hover:bg-pink-800/40 transition-colors">
										<Heart
											size={16}
											className="text-pink-600 dark:text-pink-400"
										/>
									</div>
									<span className="font-medium text-foreground group-hover:text-pink-700 dark:group-hover:text-pink-300">
										{t("sideBar.wishList")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
						<Link href={`/${lng}${PATHS.highlights}`} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 dark:hover:from-amber-950/30 dark:hover:to-amber-900/20 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors">
										<Highlighter
											size={16}
											className="text-amber-600 dark:text-amber-400"
										/>
									</div>
									<span className="font-medium text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300">
										{t("sideBar.highlight")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
						<Link href={`/${lng}${PATHS.memos}?isStar=true`} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-amber-100/50 dark:hover:from-amber-950/30 dark:hover:to-amber-900/20 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/40 transition-colors">
										<Star
											size={16}
											className="text-amber-600 dark:text-amber-400"
										/>
									</div>
									<span className="font-medium text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300">
										{t("sideBar.importantMemo")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
						<Link href={`/${lng}${PATHS.memos}?isReading=true`} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100/50 dark:hover:from-emerald-950/30 dark:hover:to-emerald-900/20 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/40 transition-colors">
										<BookOpen
											size={16}
											className="text-emerald-600 dark:text-emerald-400"
										/>
									</div>
									<span className="font-medium text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
										{t("sideBar.readingMemo")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
						<Link href={`/${lng}${PATHS.memosTrash}`} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-accent hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-foreground/5 group-hover:bg-foreground/10 transition-colors">
										<Trash2 size={16} className="text-muted-foreground" />
									</div>
									<span className="font-medium text-foreground/80 group-hover:text-foreground">
										{t("sideBar.trash")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
					</SidebarMenu>
				</SidebarGroup>
				<SidebarSeparator className="my-4 bg-gradient-to-r from-transparent via-border to-transparent" />
				<SidebarGroupCategory lng={lng} />
			</SidebarContent>
			<SidebarFooter className="border-t border-border bg-sidebar-accent p-3">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Link href={`/${lng}${PATHS.memosSetting}`}>
								<SidebarMenuButton
									id="settings"
									className="group w-full justify-center hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100/50 dark:hover:from-blue-950/30 dark:hover:to-blue-900/20 hover:shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
