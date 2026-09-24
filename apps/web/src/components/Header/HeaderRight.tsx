"use client";

import {
	Avatar,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@src/components/ui";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { PATHS } from "@web-memo/shared/constants";
import {
	useSignoutMutation,
	useSupabaseUserQuery,
} from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import { Button } from "@web-memo/ui";
import { LogIn, NotebookText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ToggleTheme from "./ToggleTheme";

export default function HeaderRight({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { data: user } = useSupabaseUserQuery();
	const { mutate: mutateSignout } = useSignoutMutation();
	const router = useRouter();
	const pathname = usePathname();

	const isUserLogin = !!user?.data?.user;

	const userAvatarUrl =
		user?.data?.user?.identities?.[0]?.identity_data?.avatar_url ??
		"/images/pngs/default_image_user.png";

	const isLoginPage = pathname === `/${lng}${PATHS.login}`;

	const handleSignoutClick = () => {
		mutateSignout();
		void syncLoginStatusToExtension();
		router.push(`/${lng}${PATHS.login}`);
	};

	return (
		<div className="flex items-center gap-2">
			{isUserLogin && <HeaderMemosLink lng={lng} pathname={pathname} />}
			{!isUserLogin && !isLoginPage && (
				<HeaderLoginLink lng={lng} pathname={pathname} />
			)}
			<ToggleTheme />
			{isUserLogin && (
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Avatar className="h-8 w-8">
							<Image src={userAvatarUrl} alt="avatar" width={32} height={32} />
						</Avatar>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>
							<button type="button" onClick={handleSignoutClick}>
								{t("header.logout")}
							</button>
						</DropdownMenuLabel>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}

/** 로그인한 사용자를 메모 목록으로 보내는 헤더 진입점입니다. */
const HeaderMemosLink = ({ lng, pathname }: IFHeaderEntryLinkProps) => {
	const { t } = useTranslation(lng);

	const handleMemosLinkClick = () => {
		analytics.trackEvent({
			name: "header_memos_click",
			params: { from: getPathWithoutLanguage(pathname, lng) },
		});
	};

	return (
		<Button
			variant="outline"
			size="default"
			asChild
			className={HEADER_ENTRY_BUTTON_CLASS_NAME}
		>
			<Link href={`/${lng}${PATHS.memos}`} onClick={handleMemosLinkClick}>
				<NotebookText />
				<span className="sr-only sm:not-sr-only">{t("header.myMemos")}</span>
			</Link>
		</Button>
	);
};

/** 로그아웃한 사용자를 로그인 화면으로 보내는 헤더 진입점입니다. */
const HeaderLoginLink = ({ lng, pathname }: IFHeaderEntryLinkProps) => {
	const { t } = useTranslation(lng);

	const handleLoginLinkClick = () => {
		analytics.trackEvent({
			name: "header_login_click",
			params: { from: getPathWithoutLanguage(pathname, lng) },
		});
	};

	return (
		<Button
			variant="outline"
			size="default"
			asChild
			className={HEADER_ENTRY_BUTTON_CLASS_NAME}
		>
			<Link href={`/${lng}${PATHS.login}`} onClick={handleLoginLinkClick}>
				<LogIn />
				<span className="sr-only sm:not-sr-only">{t("header.login")}</span>
			</Link>
		</Button>
	);
};

/** sm 미만에서는 아이콘만 남는 36px 정사각, sm 이상에서는 원래 폭으로 되돌린다. */
const HEADER_ENTRY_BUTTON_CLASS_NAME = "w-9 px-0 sm:w-auto sm:px-4";

/** 언어 접두사를 뺀 경로를 돌려준다. 언어 루트처럼 남는 경로가 없으면 "/"다. */
const getPathWithoutLanguage = (pathname: string, lng: LanguageType["lng"]) => {
	const languagePrefix = `/${lng}`;

	if (!pathname.startsWith(languagePrefix)) {
		return pathname;
	}

	return pathname.slice(languagePrefix.length) || "/";
};

/** 로그인 상태 변화를 확장에 알린다. 로그아웃 이동을 기다리게 하지 않도록 호출 쪽에서 await하지 않는다. */
const syncLoginStatusToExtension = async () => {
	try {
		await bridge.request.SYNC_LOGIN_STATUS();
	} catch {
		// 확장이 없거나 사이드 패널이 닫혀 수신자가 없으면 알릴 대상이 없으므로 무시한다.
	}
};

/** 헤더 진입점 링크가 받는 값. 클릭 계측의 출발 경로를 만들려고 현재 경로를 함께 받는다. */
interface IFHeaderEntryLinkProps extends LanguageType {
	pathname: string;
}
