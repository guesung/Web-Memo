"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { Users } from "lucide-react";

interface CommunityHeaderProps {
	lng: Language;
}

export default function CommunityHeader({ lng }: CommunityHeaderProps) {
	const { t } = useTranslation(lng);

	return (
		<div className="text-center mb-12">
			<div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
				<Users className="w-8 h-8 text-white" />
			</div>
			<h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
				{t("community.title")}
			</h1>
			<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
				{t("community.description")}
			</p>
		</div>
	);
}
