"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { useMemoDomainsQuery } from "@web-memo/shared/hooks";
import {
	Button,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	cn,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@web-memo/ui";
import { Check, ChevronDown, Globe, X } from "lucide-react";
import { useState } from "react";

/**
 * 메모 목록을 도메인 하나로 좁히는 선택 컨트롤.
 * @description 선택은 `?domain=`에 쓰고 category·view 등 다른 쿼리는 그대로 둔다.
 * 계정 설정처럼 Suspense 쿼리를 읽으므로 MemoView에서 클라이언트 전용으로 불러온다.
 * 도메인 목록 조회가 실패해도 메모 목록은 막지 않고 이 컨트롤만 비활성화한다.
 */
const MemoDomainFilter = ({ lng, domain }: IFMemoDomainFilterProps) => {
	const { t } = useTranslation(lng);
	const { data: domains = [], isError: isDomainsError } = useMemoDomainsQuery();
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const handleDomainSelect = (nextDomain: string | undefined) => {
		const nextUrl = new URL(window.location.href);
		if (nextDomain) {
			nextUrl.searchParams.set("domain", nextDomain);
		} else {
			nextUrl.searchParams.delete("domain");
		}
		window.history.pushState(null, "", nextUrl);
		setIsPopoverOpen(false);
	};

	if (!isDomainsError && domains.length === 0 && !domain) {
		return null;
	}

	const domainButtonContent = (
		<>
			<Globe className="h-4 w-4" aria-hidden="true" />
			{domain ? (
				<span className="max-w-[12rem] truncate">{domain}</span>
			) : (
				t("memos.domainFilter.label")
			)}
			{!domain && <ChevronDown className="h-4 w-4" aria-hidden="true" />}
		</>
	);

	return (
		<div
			className={cn(
				"flex h-10 items-center rounded-md max-sm:w-full",
				domain && "border bg-secondary",
			)}
			title={isDomainsError ? t("memos.domainFilter.loadError") : undefined}
		>
			<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant={domain ? "ghost" : "outline"}
						disabled={isDomainsError}
						className={cn(
							"h-10 max-sm:flex-1 max-sm:justify-start",
							domain && "min-w-0",
						)}
					>
						{domainButtonContent}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-64 p-0">
					<Command>
						<CommandInput
							placeholder={t("memos.domainFilter.searchPlaceholder")}
						/>
						<CommandList className="max-h-64">
							<CommandEmpty>{t("memos.domainFilter.noResults")}</CommandEmpty>
							<CommandGroup>
								<CommandItem
									value="all-domains"
									keywords={[t("memos.domainFilter.all")]}
									onSelect={() => handleDomainSelect(undefined)}
								>
									<Check
										className={cn("h-4 w-4", domain && "opacity-0")}
										aria-hidden="true"
									/>
									{t("memos.domainFilter.all")}
								</CommandItem>
								{domains.map((memoDomain) => (
									<CommandItem
										key={memoDomain}
										value={memoDomain}
										onSelect={() => handleDomainSelect(memoDomain)}
									>
										<Check
											className={cn(
												"h-4 w-4",
												memoDomain !== domain && "opacity-0",
											)}
											aria-hidden="true"
										/>
										<span className="truncate">{memoDomain}</span>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{domain && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="mr-1 h-6 w-6 shrink-0"
					aria-label={t("memos.domainFilter.clear")}
					onClick={() => handleDomainSelect(undefined)}
				>
					<X className="h-4 w-4" aria-hidden="true" />
				</Button>
			)}
		</div>
	);
};

export default MemoDomainFilter;

/** 도메인 선택 컨트롤의 언어와 현재 선택. */
interface IFMemoDomainFilterProps extends LanguageType {
	/** 정규화된 선택 도메인. 필터가 없으면 undefined */
	domain: string | undefined;
}
