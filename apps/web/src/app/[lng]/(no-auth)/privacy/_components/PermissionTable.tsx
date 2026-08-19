import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { PRIVACY_PERMISSIONS } from "../_constants";

/** 확장 프로그램이 요청하는 권한과 그 사용 이유를 정리한 표 */
export default async function PermissionTable({ lng }: PermissionTableProps) {
	const { t } = await useTranslation(lng);

	return (
		<div className="mt-6 overflow-x-auto rounded-lg border border-border">
			<table className="w-full min-w-[36rem] border-collapse text-left text-sm">
				<thead className="bg-muted/60">
					<tr>
						<th scope="col" className="px-4 py-3 font-semibold">
							{t("privacy.sections.permissions.columns.permission")}
						</th>
						<th scope="col" className="px-4 py-3 font-semibold">
							{t("privacy.sections.permissions.columns.reason")}
						</th>
					</tr>
				</thead>
				<tbody>
					{PRIVACY_PERMISSIONS.map((permissionKey) => (
						<tr key={permissionKey} className="border-border border-t">
							<th
								scope="row"
								className="whitespace-nowrap px-4 py-3 text-left align-top font-medium text-foreground"
							>
								{t(`privacy.permission_items.${permissionKey}.name`)}
							</th>
							<td className="px-4 py-3 align-top text-muted-foreground leading-relaxed">
								{t(`privacy.permission_items.${permissionKey}.reason`)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface PermissionTableProps extends LanguageType {}
