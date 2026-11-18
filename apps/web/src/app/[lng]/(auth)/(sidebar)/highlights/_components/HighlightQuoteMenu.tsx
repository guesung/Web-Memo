"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@web-memo/ui";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useRef } from "react";

interface HighlightQuoteMenuProps {
	lng: Language;
	disabled?: boolean;
	/** 메뉴가 완전히 닫힌 뒤에 호출된다. */
	onDeleteSelect: () => void;
}

/** 하이라이트 문장 옆 ⋯ 버튼과 삭제 메뉴. */
export function HighlightQuoteMenu({
	lng,
	disabled,
	onDeleteSelect,
}: HighlightQuoteMenuProps) {
	const { t } = useTranslation(lng);
	const isDeleteRequestedRef = useRef(false);

	// 메뉴가 닫힌 뒤에 다이얼로그를 열어야 포커스·포인터 잠금이 풀린다.
	const handleCloseAutoFocus = (event: Event) => {
		if (!isDeleteRequestedRef.current) return;

		isDeleteRequestedRef.current = false;
		event.preventDefault();
		onDeleteSelect();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					disabled={disabled}
					aria-label={t("highlight.menu.label")}
					className="shrink-0 self-start text-muted-foreground"
				>
					<MoreHorizontal size={16} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" onCloseAutoFocus={handleCloseAutoFocus}>
				<DropdownMenuItem
					onSelect={() => {
						isDeleteRequestedRef.current = true;
					}}
					className="cursor-pointer gap-2 text-destructive focus:text-destructive"
				>
					<Trash2 size={16} />
					{t("highlight.delete.menu")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
