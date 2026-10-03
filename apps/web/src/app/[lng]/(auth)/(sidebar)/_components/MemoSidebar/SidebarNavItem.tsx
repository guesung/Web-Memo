"use client";

import LocalizedLink from "@src/components/LocalizedLink";
import { getLocalizedHref } from "@src/components/LocalizedLink/getLocalizedHref";
import type { Language } from "@src/modules/i18n";
import { cn } from "@web-memo/shared/utils";
import { SidebarMenuButton, SidebarMenuItem } from "@web-memo/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** 사이드바 이동 행의 경로와 표시 정보. */
interface IFSidebarNavItemProps {
	lng: Language;
	/** 로케일 접두사가 없는 내부 페이지 경로 */
	href: string;
	label: string;
	/** 서버에서 그려 넘긴 lucide 아이콘 */
	icon: ReactNode;
	/** 아이콘 칩에 얹을 색. 항목을 구분하는 유일한 색 신호다 */
	iconChipClassName: string;
}

/**
 * 사이드바의 이동 항목 하나. 현재 경로면 활성 표시를 붙인다.
 *
 * @description 필터가 쿼리 파라미터이던 시절에는 서버 컴포넌트가 현재 탭을 알 수 없어
 * 활성 표시 자체가 없었다. 라우트가 된 지금은 pathname만 보면 되므로, 이 항목만 클라이언트로
 * 내리고 나머지 사이드바는 서버 컴포넌트로 둔다.
 */
const SidebarNavItem = ({
	lng,
	href,
	label,
	icon,
	iconChipClassName,
}: IFSidebarNavItemProps) => {
	const pathname = usePathname();
	const isActive = pathname === getLocalizedHref(lng, href);

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				size="lg"
				className={cn(
					"group relative h-12 w-full overflow-hidden rounded-none px-3 transition-colors duration-200",
					"hover:bg-accent hover:shadow-sm",
					{ "bg-primary/10 hover:bg-primary/10": isActive },
				)}
			>
				<LocalizedLink
					lng={lng}
					href={href}
					aria-current={isActive ? "page" : undefined}
				>
					{isActive && (
						<span className="absolute left-0 top-0 h-full w-0.5 bg-primary" />
					)}
					<div className="flex items-center gap-3 w-full">
						<div
							className={cn(
								"flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
								iconChipClassName,
							)}
						>
							{icon}
						</div>
						<span
							className={cn("font-medium text-foreground", {
								"text-primary font-semibold": isActive,
							})}
						>
							{label}
						</span>
					</div>
				</LocalizedLink>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
};

export default SidebarNavItem;
