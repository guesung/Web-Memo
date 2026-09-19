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
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ToggleTheme from "./ToggleTheme";

export default function HeaderRight({ lng }: LanguageType) {
	const { t } = useTranslation(lng);
	const { data: user } = useSupabaseUserQuery();
	const { mutate: mutateSignout } = useSignoutMutation();
	const router = useRouter();

	const isUserLogin = !!user?.data?.user;

	const userAvatarUrl =
		user?.data?.user?.identities?.[0]?.identity_data?.avatar_url ??
		"/images/pngs/default_image_user.png";

	const handleSignoutClick = () => {
		mutateSignout();
		void syncLoginStatusToExtension();
		router.push(`/${lng}${PATHS.login}`);
	};

	return (
		<div className="flex items-center gap-2">
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

/** 로그인 상태 변화를 확장에 알린다. 로그아웃 이동을 기다리게 하지 않도록 호출 쪽에서 await하지 않는다. */
const syncLoginStatusToExtension = async () => {
	try {
		await bridge.request.SYNC_LOGIN_STATUS();
	} catch {
		// 확장이 없거나 사이드 패널이 닫혀 수신자가 없으면 알릴 대상이 없으므로 무시한다.
	}
};
