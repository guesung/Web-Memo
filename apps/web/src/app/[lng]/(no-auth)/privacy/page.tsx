import { HeaderMargin } from "@src/components/Header";
import type { Language, LanguageParams } from "@src/modules/i18n";

import {
	DataCollectionGroups,
	PermissionTable,
	PolicyHero,
	PolicySection,
	ThirdPartyTable,
} from "./_components";
import { PRIVACY_SECTIONS, type TPrivacySectionKey } from "./_constants";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

export default async function PrivacyPage({
	params: { lng },
}: PrivacyPageProps) {
	return (
		<div className="min-h-screen">
			<HeaderMargin />
			<main className="mx-auto max-w-4xl px-4 pb-24">
				<PolicyHero lng={lng} />

				<div className="space-y-12">
					{PRIVACY_SECTIONS.map((sectionKey, sectionIndex) => (
						<PolicySection
							key={sectionKey}
							lng={lng}
							sectionKey={sectionKey}
							index={sectionIndex + 1}
						>
							{renderSectionExtra(sectionKey, lng)}
						</PolicySection>
					))}
				</div>
			</main>
		</div>
	);
}

/** 표가 필요한 섹션에만 전용 컴포넌트를 덧붙인다 */
function renderSectionExtra(sectionKey: TPrivacySectionKey, lng: Language) {
	if (sectionKey === "collect") {
		return <DataCollectionGroups lng={lng} />;
	}

	if (sectionKey === "permissions") {
		return <PermissionTable lng={lng} />;
	}

	if (sectionKey === "share") {
		return <ThirdPartyTable lng={lng} />;
	}

	return null;
}

interface PrivacyPageProps extends LanguageParams {}
