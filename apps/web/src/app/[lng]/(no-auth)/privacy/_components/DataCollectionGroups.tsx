import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { PRIVACY_COLLECT_GROUPS } from "../_constants";
import { toStringArray } from "../_utils";

/** 수집 데이터 섹션의 범주별 상세 목록 */
export default async function DataCollectionGroups({
	lng,
}: DataCollectionGroupsProps) {
	const { t } = await useTranslation(lng);

	return (
		<div className="mt-6 space-y-6">
			{PRIVACY_COLLECT_GROUPS.map((groupKey) => {
				const items = toStringArray(
					t(`privacy.sections.collect.groups.${groupKey}.items`, {
						returnObjects: true,
					}),
				);

				return (
					<article
						key={groupKey}
						className="rounded-lg border border-border p-5"
					>
						<h3 className="mb-2 font-semibold text-foreground">
							{t(`privacy.sections.collect.groups.${groupKey}.title`)}
						</h3>
						<p className="mb-4 text-muted-foreground text-sm leading-relaxed">
							{t(`privacy.sections.collect.groups.${groupKey}.description`)}
						</p>
						<ul className="space-y-2">
							{items.map((item) => (
								<li
									key={item}
									className="flex gap-3 text-muted-foreground text-sm leading-relaxed"
								>
									<span aria-hidden="true" className="select-none">
										·
									</span>
									<span>{item}</span>
								</li>
							))}
						</ul>
					</article>
				);
			})}
		</div>
	);
}

interface DataCollectionGroupsProps extends LanguageType {}
