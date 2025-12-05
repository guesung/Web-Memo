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
import { Heart, Home, SettingsIcon } from "lucide-react";
import Link from "next/link";

import SidebarGroupCategory from "./SidebarGroupCategory";

export default async function MemoSidebar({ lng }: LanguageType) {
	const { t } = await useTranslation(lng);

	return (
		<Sidebar className="border-r border-gray-200 dark:border-gray-800">
			<HeaderMargin />
			<SidebarContent className="bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-950">
				<SidebarGroup className="pt-4">
					<SidebarMenu className="space-y-1">
						<Link href={PATHS.memos} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100/50 dark:hover:from-purple-950/30 dark:hover:to-purple-900/20 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
										<Home
											size={16}
											className="text-purple-600 dark:text-purple-400"
										/>
									</div>
									<span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">
										{t("sideBar.memo")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
						<Link href={`${PATHS.memos}?isWish=true`} replace>
							<SidebarMenuButton className="group relative overflow-hidden transition-all duration-200 hover:bg-gradient-to-r hover:from-pink-50 hover:to-pink-100/50 dark:hover:from-pink-950/30 dark:hover:to-pink-900/20 hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]">
								<div className="flex items-center gap-3 w-full">
									<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 group-hover:bg-pink-200 dark:group-hover:bg-pink-800/40 transition-colors">
										<Heart
											size={16}
											className="text-pink-600 dark:text-pink-400"
										/>
									</div>
									<span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-pink-700 dark:group-hover:text-pink-300">
										{t("sideBar.wishList")}
									</span>
								</div>
							</SidebarMenuButton>
						</Link>
					</SidebarMenu>
				</SidebarGroup>
				<SidebarSeparator className="my-4 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
				<SidebarGroupCategory lng={lng} />
			</SidebarContent>
			<SidebarFooter className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-3">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Link href={PATHS.memosSetting}>
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
							className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300"
						>
							<p>{t("sideBar.settings")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</SidebarFooter>
		</Sidebar>
	);
}
