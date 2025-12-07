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
		bridge.request.SYNC_LOGIN_STATUS();
		router.push(PATHS.login);
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
