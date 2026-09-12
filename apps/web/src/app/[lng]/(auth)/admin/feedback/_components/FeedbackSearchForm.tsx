"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useDebounce } from "@web-memo/shared/hooks";
import { Input } from "@web-memo/ui";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface FeedbackSearchFormProps extends LanguageType {}

/**
 * 피드백 내용 검색 입력.
 * @description 검색어를 URL(`?q=`)에 둔다. 표·페이지네이션이 같은 값을 보고,
 * 슬랙에서 받은 `?id=` 링크와도 한 곳에서 조합되기 때문이다.
 */
export default function FeedbackSearchForm({ lng }: FeedbackSearchFormProps) {
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
				placeholder={t("admin.feedback.search_placeholder")}
				value={searchQuery}
				onChange={handleSearchQueryChange}
				className="pl-10"
			/>
		</div>
	);
}
