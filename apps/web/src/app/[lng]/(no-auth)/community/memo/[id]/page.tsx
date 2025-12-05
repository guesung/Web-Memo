import { HeaderMargin } from "@src/components/Header";
import type { Language } from "@src/modules/i18n";
import { Suspense } from "react";

import { MemoDetail } from "./_components";
import { metadataEnglish, metadataKorean } from "./_utils";

interface MemoDetailPageProps {
	params: {
		lng: Language;
		id: string;
	};
}

export async function generateMetadata({ params }: MemoDetailPageProps) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

export default async function MemoDetailPage({
	params: { lng, id },
}: MemoDetailPageProps) {
	const memoId = Number.parseInt(id, 10);

	if (Number.isNaN(memoId)) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
				<HeaderMargin />
				<main className="container mx-auto px-4 py-8 max-w-7xl">
					<div className="text-center py-20">
						<p className="text-gray-500 dark:text-gray-400">Invalid memo ID</p>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
			<HeaderMargin />
			<main className="container mx-auto px-4 py-8 max-w-7xl">
				<Suspense
					fallback={
						<div className="flex justify-center py-20">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
						</div>
					}
				>
					<MemoDetail id={memoId} lng={lng} />
				</Suspense>
			</main>
		</div>
	);
}
