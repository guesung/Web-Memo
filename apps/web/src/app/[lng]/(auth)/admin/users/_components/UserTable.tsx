"use client";

import "dayjs/locale/en";
import "dayjs/locale/ko";

import type { Language, LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useAdminUsersQuery } from "@web-memo/shared/hooks";
import type { AdminUser } from "@web-memo/shared/utils";
import {
	Button,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@web-memo/ui";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ArrowDown, ArrowUp, ArrowUpDown, Info } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// 루트 레이아웃의 InitDayjs는 useEffect로 플러그인을 붙이므로 첫 렌더(특히 SSR)에는 아직 적용돼 있지 않다.
// dayjs.extend는 여러 번 불러도 안전해 이 표에서 한 번 더 확정해 둔다.
dayjs.extend(relativeTime);

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
	const [sortKey, setSortKey] = useState<TSortKey>("created_at");
	const [sortOrder, setSortOrder] = useState<TSortOrder>("desc");

	const handleSortChange = (key: TSortKey) => {
		if (sortKey === key) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");

			return;
		}

		setSortKey(key);
		setSortOrder("desc");
	};

	const handleSearchClearClick = () => {
		router.replace(pathname);
	};

	const sortedUsers = [...users].sort((a, b) => {
		const multiplier = sortOrder === "asc" ? 1 : -1;

		if (sortKey === "memo_count") {
			return multiplier * (a.memo_count - b.memo_count);
		}

		if (sortKey === "last_activity_at") {
			// 활동이 없는 사용자는 정렬 방향과 무관하게 맨 뒤로 보낸다.
			// 내림차순에서 "없음"이 먼저 나오면 첫 줄이 가장 쓸모없는 정보가 된다.
			if (!a.last_activity_at && !b.last_activity_at) {
				return 0;
			}
			if (!a.last_activity_at) {
				return 1;
			}
			if (!b.last_activity_at) {
				return -1;
			}

			return (
				multiplier *
				(new Date(a.last_activity_at).getTime() -
					new Date(b.last_activity_at).getTime())
			);
		}

		return (
			multiplier *
			(new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
		);
	});

	const renderSortIcon = (key: TSortKey) => {
		if (sortKey !== key) {
			return <ArrowUpDown className="ml-1 h-4 w-4" />;
		}

		return sortOrder === "asc" ? (
			<ArrowUp className="ml-1 h-4 w-4" />
		) : (
			<ArrowDown className="ml-1 h-4 w-4" />
		);
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
								className="hidden sm:table-cell cursor-pointer select-none"
								onClick={() => handleSortChange("created_at")}
							>
								<div className="flex items-center">
									{t("admin.users.joined")}
									{renderSortIcon("created_at")}
								</div>
							</TableHead>
							<TableHead className="hidden lg:table-cell">UUID</TableHead>
							<TableHead>Email</TableHead>
							<TableHead
								className="cursor-pointer select-none"
								onClick={() => handleSortChange("memo_count")}
							>
								<div className="flex items-center">
									{t("admin.users.memos")}
									{renderSortIcon("memo_count")}
								</div>
							</TableHead>
							<TableHead
								className="cursor-pointer select-none"
								onClick={() => handleSortChange("last_activity_at")}
							>
								<div className="flex items-center gap-1">
									{t("admin.users.last_activity")}
									<TooltipProvider delayDuration={200}>
										<Tooltip>
											{/* 헤더 전체가 정렬 버튼이라, 안내를 누르려다 정렬이 뒤집히지 않게 막는다. */}
											<TooltipTrigger
												onClick={(event) => event.stopPropagation()}
											>
												<Info className="h-3.5 w-3.5 text-muted-foreground" />
											</TooltipTrigger>
											<TooltipContent>
												{t("admin.users.last_activity_hint")}
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									{renderSortIcon("last_activity_at")}
								</div>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedUsers.map((user) => (
							<UserRow key={user.user_id} lng={lng} user={user} />
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

interface UserRowProps extends LanguageType {
	user: AdminUser;
}

/** 사용자 한 명의 행 */
function UserRow({ lng, user }: UserRowProps) {
	const { t } = useTranslation(lng);
	const locale = lng === "ko" ? "ko-KR" : "en-US";

	return (
		<TableRow>
			<TableCell className="hidden sm:table-cell">
				{user.created_at
					? new Date(user.created_at).toLocaleDateString(locale)
					: "-"}
			</TableCell>
			<TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
				{user.user_id}
			</TableCell>
			<TableCell>{user.email || "-"}</TableCell>
			<TableCell>{user.memo_count.toLocaleString()}</TableCell>
			{user.last_activity_at ? (
				// 바로 옆 가입일 열과 형식이 같아지면 두 날짜가 섞여 읽히므로 상대 표기로 쓰고,
				// 정확한 시각이 필요한 사람을 위해 절대 시각을 title에 남긴다.
				<TableCell
					title={new Date(user.last_activity_at).toLocaleString(locale)}
				>
					{formatRelativeTime({ isoDate: user.last_activity_at, lng })}
				</TableCell>
			) : (
				<TableCell className="text-muted-foreground">
					{t("admin.users.last_activity_empty")}
				</TableCell>
			)}
		</TableRow>
	);
}

/** ISO 문자열을 "3시간 전"처럼 지금 기준 상대 표기로 바꾼다 */
function formatRelativeTime({
	isoDate,
	lng,
}: {
	isoDate: string;
	lng: Language;
}) {
	return dayjs(isoDate).locale(lng).fromNow();
}

/** 사용자 목록을 다시 세우는 기준 열 */
type TSortKey = "created_at" | "memo_count" | "last_activity_at";

/** 정렬 방향 */
type TSortOrder = "asc" | "desc";
