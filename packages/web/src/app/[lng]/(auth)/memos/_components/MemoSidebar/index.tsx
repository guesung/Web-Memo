"use server";

import { PATHS } from "@extension/shared/constants";
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
} from "@extension/ui";
import { HeaderMargin } from "@src/components/Header";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Heart, Home, SettingsIcon } from "lucide-react";
import Link from "next/link";

import SidebarGroupCategory from "./SidebarGroupCategory";

export default async function MemoSidebar({ lng }: LanguageType) {
	const { t } = await useTranslation(lng);

	return (
		<Sidebar>
			<HeaderMargin />
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						<Link href={PATHS.memos} replace>
							<SidebarMenuButton>
								<Home size={16} />
								{t("sideBar.memo")}
							</SidebarMenuButton>
						</Link>
						<Link href={`${PATHS.memos}?isWish=true`} replace>
							<SidebarMenuButton>
								<Heart size={16} />
								{t("sideBar.wishList")}
							</SidebarMenuButton>
						</Link>
					</SidebarMenu>
				</SidebarGroup>
				<SidebarSeparator />
				<SidebarGroupCategory lng={lng} />
			</SidebarContent>
			<SidebarFooter>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Link href={PATHS.memosSetting}>
								<SidebarMenuButton>
									<SettingsIcon size={16} />
								</SidebarMenuButton>
							</Link>
						</TooltipTrigger>
						<TooltipContent>
							<p>{t("sideBar.settings")}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</SidebarFooter>
		</Sidebar>
	);
}
