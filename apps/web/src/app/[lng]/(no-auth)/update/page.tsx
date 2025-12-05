import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import type { Metadata } from "next";

import { UpdateList, UpdateTitle } from "./_components";

const metadataKorean: Metadata = {
	title: "웹 메모 | 업데이트 소식 ",
	description: "웹 메모의 최신 업데이트 소식을 확인하세요.",
	alternates: {
		canonical: "https://web-memo.site/ko/update",
		languages: {
			ko: "https://web-memo.site/ko/update",
			en: "https://web-memo.site/en/update",
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};

const metadataEnglish: Metadata = {
	title: "Web Memo | Updates",
	description: "Check out the latest updates for Web Memo.",
	alternates: {
		canonical: "https://web-memo.site/en/update",
		languages: {
			ko: "https://web-memo.site/ko/update",
			en: "https://web-memo.site/en/update",
		},
	},
	openGraph: {
		images: ["/og-image.png"],
	},
};

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface UpdatesPageProps extends LanguageParams {}

export default async function UpdatesPage({
	params: { lng },
}: UpdatesPageProps) {
	return (
		<main className="bg-background min-h-screen">
			<HeaderMargin />
			<div className="container mx-auto px-4 py-16">
				<UpdateTitle lng={lng} />
				<UpdateList lng={lng} />
			</div>
		</main>
	);
}
