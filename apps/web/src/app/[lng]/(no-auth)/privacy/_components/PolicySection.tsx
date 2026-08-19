import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import type { ReactNode } from "react";
import type { TPrivacySectionKey } from "../_constants";
import { toStringArray } from "../_utils";

/** 방침 본문의 한 섹션. 번호가 붙은 제목과 문단·불릿을 렌더하고, 표 등 추가 내용은 children으로 받는다 */
export default async function PolicySection({
	lng,
	sectionKey,
	index,
	children,
}: PolicySectionProps) {
	const { t } = await useTranslation(lng);

	const paragraphs = toStringArray(
		t(`privacy.sections.${sectionKey}.body`, { returnObjects: true }),
	);
	const items = toStringArray(
		t(`privacy.sections.${sectionKey}.items`, { returnObjects: true }),
	);

	return (
		<section id={sectionKey} className="scroll-mt-24">
			<h2 className="mb-4 font-semibold text-2xl text-foreground">
				{index}. {t(`privacy.sections.${sectionKey}.title`)}
			</h2>

			<div className="space-y-4">
				{paragraphs.map((paragraph) => (
					<p key={paragraph} className="text-muted-foreground leading-relaxed">
						{paragraph}
					</p>
				))}
			</div>

			{items.length > 0 && (
				<ul className="mt-4 space-y-2">
					{items.map((item) => (
						<li
							key={item}
							className="flex gap-3 text-muted-foreground leading-relaxed"
						>
							<span aria-hidden="true" className="select-none">
								·
							</span>
							<span>{item}</span>
						</li>
					))}
				</ul>
			)}

			{children}
		</section>
	);
}

interface PolicySectionProps extends LanguageType {
	/** 렌더할 섹션의 번역 키 */
	sectionKey: TPrivacySectionKey;
	/** 제목 앞에 붙는 섹션 번호 */
	index: number;
	/** 표 등 섹션 하단에 덧붙일 내용 */
	children?: ReactNode;
}
