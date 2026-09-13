"use client";

import { cn } from "@web-memo/shared/utils";
import { SidebarMenuButton } from "@web-memo/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface IFSidebarNavItemProps {
	/** 로케일 접두사까지 포함한 전체 경로 */
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
export default function SidebarNavItem({
	href,
	label,
	icon,
	iconChipClassName,
}: IFSidebarNavItemProps) {
	const pathname = usePathname();
	const isActive = pathname === href;

	return (
		<Link href={href} aria-current={isActive ? "page" : undefined}>
			<SidebarMenuButton
				className={cn(
					"group relative overflow-hidden transition-all duration-200",
					"hover:bg-accent hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]",
					{ "bg-primary/10 hover:bg-primary/10": isActive },
				)}
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
			</SidebarMenuButton>
		</Link>
	);
}
