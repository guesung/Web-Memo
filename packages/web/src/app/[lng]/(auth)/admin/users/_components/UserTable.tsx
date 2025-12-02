"use client";

import type { LanguageType } from "@src/modules/i18n";
import { useAdminUsersQuery } from "@web-memo/shared/hooks";
import {
	Badge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@web-memo/ui";

interface UserTableProps extends LanguageType {}

export default function UserTable({ lng }: UserTableProps) {
	const { users, totalCount } = useAdminUsersQuery();

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
							<TableHead>{lng === "ko" ? "닉네임" : "Nickname"}</TableHead>
							<TableHead>{lng === "ko" ? "역할" : "Role"}</TableHead>
							<TableHead>{lng === "ko" ? "메모 수" : "Memos"}</TableHead>
							<TableHead>{lng === "ko" ? "가입일" : "Joined"}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((user) => (
							<TableRow key={user.user_id}>
								<TableCell className="font-medium">
									{user.nickname || (
										<span className="text-muted-foreground italic">
											{lng === "ko" ? "(미설정)" : "(Not set)"}
										</span>
									)}
								</TableCell>
								<TableCell>
									<Badge
										variant={user.role === "admin" ? "default" : "secondary"}
									>
										{user.role}
									</Badge>
								</TableCell>
								<TableCell>{user.memo_count.toLocaleString()}</TableCell>
								<TableCell>
									{user.created_at
										? new Date(user.created_at).toLocaleDateString(
												lng === "ko" ? "ko-KR" : "en-US",
											)
										: "-"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
