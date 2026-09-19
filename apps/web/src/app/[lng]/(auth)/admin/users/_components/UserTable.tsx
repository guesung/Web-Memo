"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useAdminUsersQuery } from "@web-memo/shared/hooks";
import {
	Button,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web-memo/ui";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type SortKey = "created_at" | "memo_count";
type SortOrder = "asc" | "desc";

interface UserTableProps extends LanguageType {}

/**
 * 관리자 사용자 목록 표.
 * @description 검색어는 URL(`?q=`)에서 읽는다. 검색 폼과 상태를 주고받지 않고 URL 하나만 보므로
 * 서버 프리페치·새로고침·링크 공유가 같은 조회 결과를 가리킨다.
 */
export default function UserTable({ lng }: UserTableProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const searchQuery = searchParams.get("q") ?? "";
	const { users, totalCount } = useAdminUsersQuery({
		searchQuery: searchQuery || undefined,
	});
	const [sortKey, setSortKey] = useState<SortKey>("created_at");
	const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortOrder("desc");
		}
	};

	const sortedUsers = [...users].sort((a, b) => {
		const multiplier = sortOrder === "asc" ? 1 : -1;
		if (sortKey === "created_at") {
			return (
				multiplier *
				(new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
			);
		}
		return multiplier * (a.memo_count - b.memo_count);
	});

	const getSortIcon = (key: SortKey) => {
		if (sortKey !== key) return <ArrowUpDown className="ml-1 h-4 w-4" />;
		return sortOrder === "asc" ? (
			<ArrowUp className="ml-1 h-4 w-4" />
		) : (
			<ArrowDown className="ml-1 h-4 w-4" />
		);
	};

	const handleSearchClearClick = () => {
		router.replace(pathname);
	};

	if (users.length === 0 && searchQuery) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<p>{t("admin.users.search_empty", { query: searchQuery })}</p>
				<Button
					variant="outline"
					size="sm"
					className="mt-4"
					onClick={handleSearchClearClick}
				>
					{t("admin.users.clear_search")}
				</Button>
			</div>
		);
	}

	if (users.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				{t("admin.users.empty")}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="text-sm text-muted-foreground">
				{t("admin.users.total", { count: totalCount })}
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead
								className="cursor-pointer select-none"
								onClick={() => handleSort("created_at")}
							>
								<div className="flex items-center">
									{t("admin.users.joined")}
									{getSortIcon("created_at")}
								</div>
							</TableHead>
							<TableHead>UUID</TableHead>
							<TableHead>Email</TableHead>
							<TableHead
								className="cursor-pointer select-none"
								onClick={() => handleSort("memo_count")}
							>
								<div className="flex items-center">
									{t("admin.users.memos")}
									{getSortIcon("memo_count")}
								</div>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedUsers.map((user) => (
							<TableRow key={user.user_id}>
								<TableCell>
									{user.created_at
										? new Date(user.created_at).toLocaleDateString(
												lng === "ko" ? "ko-KR" : "en-US",
											)
										: "-"}
								</TableCell>
								<TableCell className="font-mono text-xs text-muted-foreground">
									{user.user_id}
								</TableCell>
								<TableCell>{user.email || "-"}</TableCell>
								<TableCell>{user.memo_count.toLocaleString()}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
