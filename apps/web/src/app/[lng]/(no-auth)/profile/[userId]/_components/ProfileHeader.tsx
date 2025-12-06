"use client";

import type { Language } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import {
	useProfileWithStatsQuery,
	useSupabaseUserQuery,
	useFollowUserMutation,
	useUnfollowUserMutation,
} from "@web-memo/shared/hooks";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@web-memo/ui";
import { formatDistanceToNow } from "date-fns";
import { ko, enUS } from "date-fns/locale";
import { Calendar, FileText, Globe, Loader2, User, UserMinus, UserPlus, Users } from "lucide-react";
import { useOptimistic } from "react";

export default function ProfileHeader({ userId, lng }: ProfileHeaderProps) {
	const { t } = useTranslation(lng);
	const { data: userResponse } = useSupabaseUserQuery();
	const currentUserId = userResponse?.data?.user?.id;
	const { data: profile, isLoading } = useProfileWithStatsQuery(userId);
	const followMutation = useFollowUserMutation();
	const unfollowMutation = useUnfollowUserMutation();

	const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(
		profile?.is_following ?? false,
	);
	const [optimisticFollowerCount, setOptimisticFollowerCount] = useOptimistic(
		profile?.follower_count ?? 0,
	);

	const isOwnProfile = currentUserId === userId;
	const canFollow = currentUserId && !isOwnProfile;

	const handleFollow = async () => {
		if (!currentUserId) return;

		if (optimisticFollowing) {
			setOptimisticFollowing(false);
			setOptimisticFollowerCount(Math.max(0, optimisticFollowerCount - 1));
			await unfollowMutation.mutateAsync({
				followerId: currentUserId,
				followingId: userId,
			});
		} else {
			setOptimisticFollowing(true);
			setOptimisticFollowerCount(optimisticFollowerCount + 1);
			await followMutation.mutateAsync({
				followerId: currentUserId,
				followingId: userId,
			});
		}
	};

	if (isLoading) {
		return (
			<div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
				<div className="flex items-start gap-6">
					<div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
					<div className="flex-1 space-y-3">
						<div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
						<div className="h-4 w-60 bg-gray-200 dark:bg-gray-700 rounded" />
					</div>
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 text-center">
				<p className="text-gray-500 dark:text-gray-400">
					{t("profile.noMemos")}
				</p>
			</div>
		);
	}

	const dateLocale = lng === "ko" ? ko : enUS;
	const joinedTime = profile.created_at
		? formatDistanceToNow(new Date(profile.created_at), {
				addSuffix: true,
				locale: dateLocale,
			})
		: null;

	return (
		<div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8">
			<div className="flex flex-col sm:flex-row items-start gap-6">
				<Avatar className="h-20 w-20 sm:h-24 sm:w-24">
					<AvatarImage
						src={profile.avatar_url || undefined}
						alt={profile.nickname || "User"}
					/>
					<AvatarFallback className="text-2xl">
						<User className="w-10 h-10" />
					</AvatarFallback>
				</Avatar>

				<div className="flex-1">
					<div className="flex items-start justify-between gap-4 mb-2">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							{profile.nickname || t("community.anonymous")}
						</h1>
						{canFollow && (
							<Button
								variant={optimisticFollowing ? "outline" : "default"}
								size="sm"
								onClick={handleFollow}
								disabled={
									followMutation.isPending || unfollowMutation.isPending
								}
							>
								{followMutation.isPending || unfollowMutation.isPending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : optimisticFollowing ? (
									<>
										<UserMinus className="w-4 h-4 mr-1" />
										{t("profile.unfollow")}
									</>
								) : (
									<>
										<UserPlus className="w-4 h-4 mr-1" />
										{t("profile.follow")}
									</>
								)}
							</Button>
						)}
					</div>

					{profile.bio && (
						<p className="text-gray-600 dark:text-gray-300 mb-4">
							{profile.bio}
						</p>
					)}

					<div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
						<div className="flex items-center gap-1">
							<FileText className="w-4 h-4" />
							<span>
								{t("profile.memoCount", { count: profile.public_memo_count })}
							</span>
						</div>

						<div className="flex items-center gap-1">
							<Users className="w-4 h-4" />
							<span>
								{t("profile.followers", { count: optimisticFollowerCount })}
							</span>
						</div>

						<div className="flex items-center gap-1">
							<Users className="w-4 h-4" />
							<span>
								{t("profile.following", { count: profile.following_count })}
							</span>
						</div>

						{profile.website && (
							<a
								href={profile.website}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline"
							>
								<Globe className="w-4 h-4" />
								<span>{new URL(profile.website).hostname}</span>
							</a>
						)}

						{joinedTime && (
							<div className="flex items-center gap-1">
								<Calendar className="w-4 h-4" />
								<span>
									{t("profile.joinedAt")} {joinedTime}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

interface ProfileHeaderProps {
	userId: string;
	lng: Language;
}
