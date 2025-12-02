import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.server";
import { Calendar, Clock, Eye, User } from "lucide-react";

interface VideoHeaderProps extends LanguageType {
	title: string;
	channelName: string | null;
	publishedAt: string | null;
	duration: string | null;
	viewCount: number;
}

export default async function VideoHeader({
	lng,
	title,
	channelName,
	publishedAt,
	duration,
	viewCount,
}: VideoHeaderProps) {
	const { t } = await useTranslation(lng);

	const formatDate = (dateString: string | null) => {
		if (!dateString) return null;
		const date = new Date(dateString);
		return date.toLocaleDateString(lng === "ko" ? "ko-KR" : "en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	return (
		<header className="mb-6">
			<h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
				{title}
			</h1>
			<div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
				{channelName && (
					<div className="flex items-center gap-1.5">
						<User className="h-4 w-4" />
						<span>{channelName}</span>
					</div>
				)}
				{publishedAt && (
					<div className="flex items-center gap-1.5">
						<Calendar className="h-4 w-4" />
						<span>{formatDate(publishedAt)}</span>
					</div>
				)}
				{duration && (
					<div className="flex items-center gap-1.5">
						<Clock className="h-4 w-4" />
						<span>{duration}</span>
					</div>
				)}
				<div className="flex items-center gap-1.5">
					<Eye className="h-4 w-4" />
					<span>
						{viewCount.toLocaleString()} {t("youtube.summary.views")}
					</span>
				</div>
			</div>
		</header>
	);
}
