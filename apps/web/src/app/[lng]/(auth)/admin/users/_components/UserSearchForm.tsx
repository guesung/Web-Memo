"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useDebounce } from "@web-memo/shared/hooks";
import { Input } from "@web-memo/ui";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface UserSearchFormProps extends LanguageType {}

/**
 * 사용자 검색 입력.
 * @description 검색어를 URL(`?q=`)에 둔다. 표가 같은 값을 읽어 조회하므로 새로고침·뒤로가기·
 * 링크 공유가 그대로 동작하고, 서버 프리페치도 같은 검색어로 키를 맞출 수 있다.
 * 히스토리에 타이핑 한 글자마다 쌓이지 않도록 `replace`로 바꾼다.
 */
export default function UserSearchForm({ lng }: UserSearchFormProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
	const { debounce } = useDebounce();

	const handleSearchQueryChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const nextSearchQuery = event.target.value;
		setSearchQuery(nextSearchQuery);

		debounce(() => {
			const nextSearchParams = new URLSearchParams();

			if (nextSearchQuery) {
				nextSearchParams.set("q", nextSearchQuery);
			}

			const queryString = nextSearchParams.toString();
			router.replace(queryString ? `${pathname}?${queryString}` : pathname);
		}, 300);
	};

	return (
		<div className="relative max-w-md">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder={t("admin.users.search_placeholder")}
				value={searchQuery}
				onChange={handleSearchQueryChange}
				className="pl-10"
			/>
		</div>
	);
}
