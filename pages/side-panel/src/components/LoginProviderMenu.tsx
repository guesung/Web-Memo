import { type TLoginProvider, useLoginEntry } from "@src/hooks";
import { I18n } from "@web-memo/shared/utils/extension";
import {
	Button,
	Loading,
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@web-memo/ui";
import type { ReactNode } from "react";
import googleLogo from "../assets/google.svg";
import kakaoLogo from "../assets/kakao.svg";

interface LoginProviderMenuProps {
	/** 메뉴를 여는 [로그인] 버튼. asChild로 붙으므로 버튼 하나만 넘긴다. */
	children: ReactNode;
	align?: "start" | "center" | "end";
}

/**
 * [로그인]을 누르면 카카오·Google 중 로그인 방법을 고르는 메뉴를 연다.
 * @description 패널의 모든 [로그인] 진입점(헤더·배너·웹 링크 팝오버·요약 안내)이 같은 메뉴를 쓴다.
 * 로그인 창이 떠 있는 동안에는 메뉴를 열어 둔 채 진행 중 문구를 보여 준다.
 *
 * @example
 * <LoginProviderMenu align="end">
 *   <Button variant="outline" size="sm">{I18n.get("login_button")}</Button>
 * </LoginProviderMenu>
 */
export default function LoginProviderMenu({
	children,
	align = "end",
}: LoginProviderMenuProps) {
	const { openLogin, pendingProvider, hasLoginError } = useLoginEntry();

	return (
		<Popover>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent
				align={align}
				role="menu"
				aria-label={I18n.get("login_method_label")}
				className="flex w-[220px] flex-col gap-1 p-1.5"
			>
				{LOGIN_PROVIDERS.map(
					({ id, logo, labelKey, pendingLabelKey, className }) => {
						const isPending = pendingProvider === id;

						return (
							<Button
								key={id}
								role="menuitem"
								className={`h-10 w-full justify-start ${className}`}
								disabled={pendingProvider !== null}
								onClick={() => void openLogin(id)}
							>
								{isPending ? (
									<Loading className="m-0" />
								) : (
									<img src={logo} alt="" className="size-[18px]" />
								)}
								{I18n.get(isPending ? pendingLabelKey : labelKey)}
							</Button>
						);
					},
				)}
				{hasLoginError && (
					<p role="alert" className="px-1.5 text-destructive text-xs">
						{I18n.get("login_failed")}
					</p>
				)}
				<p className="px-1.5 pt-1 text-muted-foreground text-[11px] leading-normal">
					{I18n.get("login_menu_hint")}
				</p>
			</PopoverContent>
		</Popover>
	);
}

/**
 * 메뉴에 내놓는 제공자 버튼.
 * @description OAuth 제공자 가이드라인이 색을 지정하므로 역할 토큰 대신 브랜드 색을 그대로 쓴다.
 */
const LOGIN_PROVIDERS = [
	{
		id: "kakao",
		logo: kakaoLogo,
		labelKey: "login_kakao_button",
		pendingLabelKey: "login_kakao_pending",
		className: "bg-[#FEE500] text-gray-900 hover:bg-[#F5DC00]",
	},
	{
		id: "google",
		logo: googleLogo,
		labelKey: "login_google_button",
		pendingLabelKey: "login_google_pending",
		className: "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
	},
] as const satisfies ReadonlyArray<{
	id: TLoginProvider;
	logo: string;
	labelKey: string;
	pendingLabelKey: string;
	className: string;
}>;
