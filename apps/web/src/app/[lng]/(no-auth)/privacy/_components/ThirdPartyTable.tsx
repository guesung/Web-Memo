import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { PRIVACY_THIRD_PARTIES } from "../_constants";

/** 데이터 처리를 위탁하는 제3자를 실명·목적·제공 항목·방침 링크와 함께 나열한 표 */
export default async function ThirdPartyTable({ lng }: ThirdPartyTableProps) {
	const { t } = await useTranslation(lng);

	return (
		<div className="mt-6 overflow-x-auto rounded-lg border border-border">
			<table className="w-full min-w-[48rem] border-collapse text-left text-sm">
				<thead className="bg-muted/60">
					<tr>
						<th scope="col" className="px-4 py-3 font-semibold">
							{t("privacy.sections.share.columns.name")}
						</th>
						<th scope="col" className="px-4 py-3 font-semibold">
							{t("privacy.sections.share.columns.purpose")}
						</th>
						<th scope="col" className="px-4 py-3 font-semibold">
							{t("privacy.sections.share.columns.data")}
						</th>
						<th scope="col" className="px-4 py-3 font-semibold">
							{t("privacy.sections.share.columns.policy")}
						</th>
					</tr>
				</thead>
				<tbody>
					{PRIVACY_THIRD_PARTIES.map((partyKey) => (
						<tr key={partyKey} className="border-border border-t">
							<th
								scope="row"
								className="px-4 py-3 text-left align-top font-medium text-foreground"
							>
								{t(`privacy.third_party_items.${partyKey}.name`)}
							</th>
							<td className="px-4 py-3 align-top text-muted-foreground leading-relaxed">
								{t(`privacy.third_party_items.${partyKey}.purpose`)}
							</td>
							<td className="px-4 py-3 align-top text-muted-foreground leading-relaxed">
								{t(`privacy.third_party_items.${partyKey}.data`)}
							</td>
							<td className="px-4 py-3 align-top">
								<Link
									href={t(`privacy.third_party_items.${partyKey}.url`)}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
								>
									{t("privacy.sections.share.columns.policy")}
									<ExternalLink className="h-3.5 w-3.5" />
								</Link>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface ThirdPartyTableProps extends LanguageType {}
