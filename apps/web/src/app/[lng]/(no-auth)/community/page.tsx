import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { Suspense } from "react";

import { CommunityFeed, CommunityHeader } from "./_components";
import { metadataEnglish, metadataKorean } from "./_utils";

export async function generateMetadata({ params }: LanguageParams) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

interface CommunityPageProps extends LanguageParams {}

export default async function CommunityPage({
	params: { lng },
}: CommunityPageProps) {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
			<HeaderMargin />
			<main className="container mx-auto px-4 py-8 max-w-7xl">
				<CommunityHeader lng={lng} />
				<Suspense
					fallback={
						<div className="flex justify-center py-20">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
						</div>
					}
				>
					<CommunityFeed lng={lng} />
				</Suspense>
			</main>
		</div>
	);
}
