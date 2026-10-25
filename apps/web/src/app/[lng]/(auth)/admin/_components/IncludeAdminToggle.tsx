"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Label, Switch } from "@web-memo/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface IFIncludeAdminToggleProps extends LanguageType {}

/**
 * 대시보드 숫자에 관리자 본인의 데이터를 포함할지 정하는 토글.
 * @description 값을 URL(`?includeAdmin=1`)에 둔다. 새로고침·뒤로가기·링크 공유가 그대로 동작하고,
 * 서버 프리페치와 클라이언트 훅이 같은 값을 보고 같은 쿼리 키를 쓴다. 히스토리를 쌓지 않으려 `replace`를 쓴다.
 */
export default function IncludeAdminToggle({ lng }: IFIncludeAdminToggleProps) {
	const { t } = useTranslation(lng);
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const isIncludeAdmin = searchParams.get("includeAdmin") === "1";

	const handleIncludeAdminChange = (checked: boolean) => {
		const nextSearchParams = new URLSearchParams(searchParams.toString());

		if (checked) {
			nextSearchParams.set("includeAdmin", "1");
		} else {
			nextSearchParams.delete("includeAdmin");
		}

		const queryString = nextSearchParams.toString();
		router.replace(queryString ? `${pathname}?${queryString}` : pathname);
	};

	return (
		<div className="flex items-start gap-3">
			<Switch
				id="include-admin-toggle"
				checked={isIncludeAdmin}
				onCheckedChange={handleIncludeAdminChange}
			/>
			<div className="grid gap-1">
				<Label htmlFor="include-admin-toggle">
					{t("admin.include_admin.label")}
				</Label>
				<p className="text-xs text-muted-foreground">
					{t("admin.include_admin.description")}
				</p>
			</div>
		</div>
	);
}
