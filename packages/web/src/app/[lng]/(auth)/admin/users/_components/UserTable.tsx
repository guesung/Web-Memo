"use client";

import { useState } from "react";
import type { LanguageType } from "@src/modules/i18n";
import { useAdminUsersQuery } from "@web-memo/shared/hooks";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web-memo/ui";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type SortKey = "created_at" | "memo_count";
type SortOrder = "asc" | "desc";

interface UserTableProps extends LanguageType {}

export default function UserTable({ lng }: UserTableProps) {
	const { users, totalCount } = useAdminUsersQuery();
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

	if (users.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				{lng === "ko" ? "사용자가 없습니다." : "No users found."}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="text-sm text-muted-foreground">
				{lng === "ko"
					? `총 ${totalCount.toLocaleString()}명의 사용자`
					: `${totalCount.toLocaleString()} users total`}
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
									{lng === "ko" ? "가입일" : "Joined"}
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
									{lng === "ko" ? "메모 수" : "Memos"}
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
									{user.user_id.slice(0, 8)}...
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
