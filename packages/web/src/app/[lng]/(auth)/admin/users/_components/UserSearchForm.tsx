"use client";

import type { LanguageType } from "@src/modules/i18n";
import { QUERY_KEY } from "@web-memo/shared/constants";
import { useDebounce } from "@web-memo/shared/hooks";
import { Input } from "@web-memo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";

interface UserSearchFormProps extends LanguageType {}

export default function UserSearchForm({ lng }: UserSearchFormProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const queryClient = useQueryClient();
	const { debounce } = useDebounce();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchQuery(value);
		debounce(() => {
			queryClient.invalidateQueries({
				queryKey: QUERY_KEY.adminUsers(value || undefined, undefined),
			});
		}, 300);
	};

	return (
		<div className="relative max-w-md">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder={
					lng === "ko"
						? "닉네임 또는 ID로 검색..."
						: "Search by nickname or ID..."
				}
				value={searchQuery}
				onChange={handleChange}
				className="pl-10"
			/>
		</div>
	);
}
