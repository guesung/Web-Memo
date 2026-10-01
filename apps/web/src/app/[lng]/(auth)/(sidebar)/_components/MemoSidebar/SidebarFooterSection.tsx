"use client";

import LocalizedLink from "@src/components/LocalizedLink";
import type { LanguageType } from "@src/modules/i18n";
import { PATHS } from "@web-memo/shared/constants";
import {
	SidebarFooter,
	SidebarMenuButton,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-memo/ui";
import { SettingsIcon } from "lucide-react";

/** 설정 섹션의 입력값. */
interface IFSidebarFooterSectionProps extends LanguageType {
	/** 현지화된 설정 이름. */
	label: string;
}

/** 전체 행을 클릭할 수 있는 설정 푸터. */
const SidebarFooterSection = ({ lng, label }: IFSidebarFooterSectionProps) => (
	<SidebarFooter className="gap-0 border-t border-border bg-sidebar-accent p-0">
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<SidebarMenuButton
						asChild
						size="lg"
						id="settings"
						className="group h-12 w-full justify-center rounded-none p-0 transition-colors hover:bg-accent hover:shadow-sm"
					>
						<LocalizedLink
							lng={lng}
							href={PATHS.memosSetting}
							aria-label={label}
						>
							<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 transition-colors group-hover:bg-blue-200 dark:bg-blue-900/30 dark:group-hover:bg-blue-800/40">
								<SettingsIcon
									size={16}
									className="text-blue-600 dark:text-blue-400"
								/>
							</span>
						</LocalizedLink>
					</SidebarMenuButton>
				</TooltipTrigger>
				<TooltipContent
					side="right"
					className="border-border bg-foreground text-background"
				>
					<p>{label}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	</SidebarFooter>
);

export default SidebarFooterSection;
