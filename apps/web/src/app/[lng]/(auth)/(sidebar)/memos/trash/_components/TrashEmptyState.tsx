"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import { Button } from "@web-memo/ui";
import { Trash2 } from "lucide-react";
import Link from "next/link";

interface IFTrashEmptyStateProps extends LanguageType {}

/**
 * 휴지통이 비었을 때 보여주는 빈 상태.
 *
 * @description 메모 목록의 빈 상태와 같은 골격(아이콘 + 문구 + 다음 행동 버튼)을 쓰되
 * 애니메이션 원과 그라디언트는 가져오지 않는다. 휴지통이 비어 있는 것은 축하할 일이 아니라
 * 그냥 아무 일도 없는 상태다.
 */
export default function TrashEmptyState({ lng }: IFTrashEmptyStateProps) {
	const { t } = useTranslation(lng);

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
			<div className="w-20 h-20 mb-6 rounded-full bg-muted flex items-center justify-center">
				<Trash2 className="h-10 w-10 text-muted-foreground" />
			</div>

			<h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3 text-center">
				{t("trash.empty")}
			</h3>

			<p className="text-muted-foreground text-center max-w-md mb-8">
				{t("trash.emptyDescription")}
			</p>

			<Button variant="outline" asChild>
				<Link href={`/${lng}${PATHS.memos}`}>{t("trash.backToMemos")}</Link>
			</Button>
		</div>
	);
}
