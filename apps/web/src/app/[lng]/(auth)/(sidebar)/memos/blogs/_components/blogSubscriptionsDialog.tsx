"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { BLOG_CATALOG } from "@web-memo/shared/constants";
import type { TBlogId } from "@web-memo/shared/types";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@web-memo/ui";

/** 토스·당근 구독을 켜고 끄는 대화상자. 해제해도 메모는 남는다. */
export default function BlogSubscriptionsDialog({
	lng,
	isOpen,
	subscribedBlogIds,
	isChanging,
	onOpenChange,
	onSubscriptionClick,
}: IFBlogSubscriptionsDialogProps) {
	const { t } = useTranslation(lng);

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-[480px]"
				onClose={() => onOpenChange(false)}
			>
				<DialogHeader>
					<DialogTitle>{t("blogs.dialog.title")}</DialogTitle>
					<DialogDescription>{t("blogs.dialog.description")}</DialogDescription>
				</DialogHeader>
				<ul>
					{BLOG_CATALOG.map((blog) => {
						const isSubscribed = subscribedBlogIds.includes(blog.blogId);
						const blogName = blog.displayName[lng];

						return (
							<li
								key={blog.blogId}
								className="flex items-center justify-between gap-3 border-b border-border py-4 last:border-b-0"
							>
								<div>
									<p className="font-semibold text-foreground">{blogName}</p>
									<p className="text-xs text-muted-foreground">
										{blog.homeUrl
											.replace(/^https?:\/\//, "")
											.replace(/\/$/, "")}
									</p>
								</div>
								<Button
									variant={isSubscribed ? "outline" : "default"}
									disabled={isChanging}
									aria-label={`${blogName} ${t(
										isSubscribed
											? "blogs.dialog.unsubscribe"
											: "blogs.dialog.subscribe",
									)}`}
									onClick={() =>
										onSubscriptionClick({
											blogId: blog.blogId,
											active: !isSubscribed,
										})
									}
								>
									{t(
										isSubscribed
											? "blogs.dialog.unsubscribe"
											: "blogs.dialog.subscribe",
									)}
								</Button>
							</li>
						);
					})}
				</ul>
				<p className="text-xs text-muted-foreground">
					{t("blogs.dialog.keepMemos")}
				</p>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t("blogs.dialog.close")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** 대화상자 열림 상태, 현재 구독 목록, 구독 변경 동작. */
interface IFBlogSubscriptionsDialogProps extends LanguageType {
	isOpen: boolean;
	subscribedBlogIds: TBlogId[];
	/** 구독 변경 요청 중이면 버튼을 잠근다 */
	isChanging: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onSubscriptionClick: (params: { blogId: TBlogId; active: boolean }) => void;
}
