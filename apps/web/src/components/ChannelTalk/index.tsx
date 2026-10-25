"use client";

import * as ChannelService from "@channel.io/channel-web-sdk-loader";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { EXTERNAL_LINK } from "@web-memo/shared/constants";
import { Button, Loading, ToastAction, toast } from "@web-memo/ui";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** 문의 버튼을 노출하는 경로들의 두 번째 세그먼트. `/[lng]/<segment>` 형태를 가정한다 */
const SUPPORTED_ROUTE_SEGMENTS = ["introduce", "memos"];

/** 채널톡 SDK 로드·boot 진행 상태 */
type TChannelTalkStatus = "idle" | "connecting" | "ready" | "error";

interface IFChannelTalkProps extends LanguageType {}

/**
 * 소개 화면과 메모 목록에서만 뜨는 공용 채널톡 문의 버튼.
 * @description
 * 기본 채널 버튼·팝업은 숨기고 이 버튼을 눌렀을 때만 `showMessenger`로 상담창을 연다.
 * memberId·profile 등 앱 데이터를 넘기지 않는 익명 boot이며, 실제 plugin key는
 * `NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY` 환경변수로 주입받는다 — 값이 없으면
 * 조용히 아무것도 렌더하지 않는다. SDK 로드·boot 실패는 이 컴포넌트 안에서만
 * 처리해 메모 화면 렌더링이나 저장 흐름에 영향을 주지 않는다.
 */
export default function ChannelTalk({ lng }: IFChannelTalkProps) {
	const { t } = useTranslation(lng);
	const pathname = usePathname();
	const buttonRef = useRef<HTMLButtonElement>(null);
	const [status, setStatus] = useState<TChannelTalkStatus>("idle");

	const pluginKey = process.env.NEXT_PUBLIC_CHANNEL_TALK_PLUGIN_KEY;
	const routeSegment = pathname.split("/")[2];
	const isSupportedRoute = SUPPORTED_ROUTE_SEGMENTS.includes(
		routeSegment ?? "",
	);

	const showConnectionErrorToast = () => {
		toast({
			title: t("support.error"),
			action: (
				<ToastAction
					altText={t("support.email")}
					onClick={() => {
						window.location.href = EXTERNAL_LINK.contactEmail;
					}}
				>
					{t("support.email")}
				</ToastAction>
			),
		});
	};

	const handleSupportButtonClick = () => {
		ChannelService.showMessenger();
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: 대상 경로에 들어올 때만 boot/shutdown하면 된다
	useEffect(() => {
		if (!pluginKey || !isSupportedRoute) return;

		setStatus("connecting");

		try {
			ChannelService.loadScript();
			ChannelService.boot(
				{
					pluginKey,
					hideChannelButtonOnBoot: true,
					hidePopup: true,
				},
				(error) => {
					if (error) {
						setStatus("error");
						showConnectionErrorToast();
						return;
					}

					setStatus("ready");
				},
			);
			ChannelService.onHideMessenger(() => {
				buttonRef.current?.focus();
			});
		} catch {
			setStatus("error");
			showConnectionErrorToast();
		}

		return () => {
			ChannelService.shutdown();
		};
	}, [pluginKey, isSupportedRoute]);

	if (!pluginKey || !isSupportedRoute) return null;

	const isConnecting = status === "connecting";

	return (
		<Button
			ref={buttonRef}
			type="button"
			aria-label={t("support.openLabel")}
			onClick={handleSupportButtonClick}
			disabled={isConnecting}
			className="fixed right-4 z-50 flex h-12 w-12 items-center justify-center gap-2 rounded-full p-0 shadow-lg sm:w-auto sm:rounded-full sm:px-4"
			style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
		>
			{isConnecting ? <Loading /> : <MessageCircle className="h-5 w-5" />}
			<span className="hidden sm:inline">
				{isConnecting ? t("support.loading") : t("support.open")}
			</span>
		</Button>
	);
}
