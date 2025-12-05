import { HeaderMargin } from "@src/components/Header";
import type { Language } from "@src/modules/i18n";
import { Suspense } from "react";

import { ProfileHeader, ProfileMemoList } from "./_components";
import { metadataEnglish, metadataKorean } from "./_utils";

interface ProfilePageProps {
	params: {
		lng: Language;
		userId: string;
	};
}

export async function generateMetadata({ params }: ProfilePageProps) {
	return params.lng === "ko" ? metadataKorean : metadataEnglish;
}

export default async function ProfilePage({
	params: { lng, userId },
}: ProfilePageProps) {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-950">
			<HeaderMargin />
			<main className="container mx-auto px-4 py-8 max-w-5xl">
				<Suspense
					fallback={
						<div className="flex justify-center py-20">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
						</div>
					}
				>
					<ProfileHeader userId={userId} lng={lng} />
					<ProfileMemoList userId={userId} lng={lng} />
				</Suspense>
			</main>
		</div>
	);
}
