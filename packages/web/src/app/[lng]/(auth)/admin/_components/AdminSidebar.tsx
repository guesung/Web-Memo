"use client";

import type { LanguageType } from "@src/modules/i18n";
import { PATHS } from "@web-memo/shared/constants";
import { cn } from "@web-memo/ui";
import { BarChart3, Home, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps extends LanguageType {}

export default function AdminSidebar({ lng }: AdminSidebarProps) {
	const pathname = usePathname();

	const menuItems = [
		{
			href: `/${lng}${PATHS.admin}`,
			icon: BarChart3,
			labelKo: "대시보드",
			labelEn: "Dashboard",
		},
		{
			href: `/${lng}${PATHS.adminUsers}`,
			icon: Users,
			labelKo: "사용자 관리",
			labelEn: "Users",
		},
		{
			href: `/${lng}${PATHS.memos}`,
			icon: Home,
			labelKo: "메모로 돌아가기",
			labelEn: "Back to Memos",
		},
	];

	return (
		<aside className="w-64 border-r bg-muted/30 p-4">
			<div className="mb-6">
				<h2 className="text-lg font-semibold px-3">
					{lng === "ko" ? "관리자" : "Admin"}
				</h2>
			</div>
			<nav className="space-y-1">
				{menuItems.map((item) => {
					const isActive =
						pathname === item.href ||
						(item.href.includes("/users") && pathname.includes("/users"));
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
								isActive
									? "bg-primary text-primary-foreground"
									: "hover:bg-muted",
							)}
						>
							<item.icon className="h-4 w-4" />
							{lng === "ko" ? item.labelKo : item.labelEn}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
