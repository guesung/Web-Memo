import { I18n, Tab } from "@web-memo/shared/utils/extension";
import { Alert, AlertDescription, AlertTitle, Button } from "@web-memo/ui";
import { ArrowRightIcon, InfoIcon, XIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { getNoticeContent, type TNoticeLinkTarget } from "./getNoticeContent";
import useNoticeBanner from "./useNoticeBanner";

/**
 * 사이드 패널 화면 중앙의 비모달 운영 공지 카드.
 * @description 로그인 여부와 무관하게 보인다. 보여줄 공지가 없으면 자리도 차지하지 않는다.
 */
const NoticeBanner = () => {
	const { notice, handleNoticeDismiss } = useNoticeBanner();

	if (!notice) {
		return null;
	}

	const noticeContent = getNoticeContent({
		notice,
		uiLanguage: I18n.getUILanguage(),
	});
	const noticeLink = noticeContent.link;

	return createPortal(
		<Alert className="fixed left-1/2 top-1/2 z-40 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto break-words pr-10 shadow-lg">
			{/* Alert가 아이콘 뒤 형제에 pl-7을 주므로 닫기 버튼은 아이콘 앞에 둔다. */}
			<Button
				variant="ghost"
				size="icon"
				className="absolute right-1 top-1 size-8"
				aria-label={I18n.get("notice_dismiss_label")}
				onClick={handleNoticeDismiss}
			>
				<XIcon className="size-4" />
			</Button>
			<InfoIcon className="size-4" />
			<AlertTitle>{noticeContent.title}</AlertTitle>
			<AlertDescription className="text-muted-foreground">
				<p className="whitespace-pre-line">{noticeContent.body}</p>
				{noticeLink && (
					<Button
						variant="link"
						className="mt-1 h-auto justify-start p-0"
						onClick={() => openNoticeLinkTarget(noticeLink.target)}
					>
						{noticeLink.label ?? I18n.get("notice_link_default_label")}
						<ArrowRightIcon className="size-4" />
					</Button>
				)}
			</AlertDescription>
		</Alert>,
		document.body,
	);
};

export default NoticeBanner;

const openNoticeLinkTarget = (linkTarget: TNoticeLinkTarget) => {
	if (linkTarget.type === "options") {
		chrome.runtime.openOptionsPage();

		return;
	}

	Tab.create({ url: linkTarget.url });
};
