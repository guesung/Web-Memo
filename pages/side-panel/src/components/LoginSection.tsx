import { type QueryState, useQueryClient } from "@tanstack/react-query";
import { CONFIG } from "@web-memo/env";
import { PATHS, QUERY_KEY } from "@web-memo/shared/constants";
import { analytics } from "@web-memo/shared/modules/analytics";
import { getResultError, isNetworkError } from "@web-memo/shared/utils";
import { I18n, Identity, Tab } from "@web-memo/shared/utils/extension";
import { Button, Loading } from "@web-memo/ui";
import {
	FileTextIcon,
	HighlighterIcon,
	PencilLineIcon,
	SearchIcon,
} from "lucide-react";
import { useState } from "react";
import googleLogo from "../assets/google.svg";
import kakaoLogo from "../assets/kakao.svg";
import useOnlineStatus from "../hooks/useOnlineStatus";
import { PANEL_LOGIN_EVENT } from "../hooks/useSyncLoginStatus";

/**
 * 로그인이 필요할 때 메모 영역 자리에 대신 보여주는 안내
 *
 * @description
 * MemoSection 의 ErrorBoundary 폴백으로도 쓰이므로 props 를 받지 않는다.
 * 네트워크가 끊겨 로그인 여부를 확인하지 못한 경우에는 로그인 안내 대신 연결 안내를 보여준다.
 * 오프라인에서는 로그인 창도 열리지 않으므로 버튼을 숨긴다.
 */
export default function LoginSection() {
	const isOnline = useOnlineStatus();
	const queryClient = useQueryClient();
	const [pendingProviderId, setPendingProviderId] =
		useState<TLoginProviderId | null>(null);
	const [hasLoginError, setHasLoginError] = useState(false);
	const isNetworkUnavailable =
		!isOnline ||
		getIsUserCheckNetworkError(queryClient.getQueryState(QUERY_KEY.user()));

	/**
	 * 고른 제공자의 로그인 창을 띄우고, 끝나면 패널을 로그인 상태로 바꿉니다.
	 * @description 로그인 창은 웹의 OAuth 시작 경로를 엽니다. 로그인 자체는 웹에서 끝나 웹 쿠키에
	 * 세션이 생기고, 창이 닫히면 패널이 그 쿠키로 세션을 복원합니다. 그래서 웹과 확장이 함께
	 * 로그인됩니다. 웹 메모 화면을 거치지 않으므로 `login`·`sign_up`은 여기서 대신 기록합니다.
	 *
	 * 확장의 client_id를 쿼리로 실어 보냅니다. 확장과 웹은 서로 다른 식별자를 써서 그냥 두면
	 * "사이드패널까지 왔다가 가입하지 않은 사람"을 셀 수 없습니다.
	 *
	 * 로그인 창을 쓸 수 없는 브라우저에서는 같은 경로를 새 탭으로 엽니다.
	 */
	const handleProviderButtonClick = async (provider: TLoginProviderId) => {
		analytics.trackEvent({
			name: "side_panel_login_click",
			params: { method: provider },
		});

		const clientId = await analytics.getExtensionClientId();
		const startUrl = new URL(`${CONFIG.webUrl}${PATHS.startOAuth}`);

		startUrl.searchParams.set("provider", provider);
		if (clientId) startUrl.searchParams.set("ext_cid", clientId);

		if (!Identity.canLaunchWebAuthFlow()) {
			Tab.create({ url: startUrl.toString() });
			return;
		}

		startUrl.searchParams.set("return", "extension");
		setPendingProviderId(provider);
		setHasLoginError(false);

		try {
			const returnedUrl = await Identity.launchWebAuthFlow(startUrl.toString());

			// 사용자가 창을 닫았다. 오류가 아니므로 조용히 원래대로 돌아간다.
			if (!returnedUrl) return;

			const result = new URL(returnedUrl).searchParams;
			const loginMethod = result.get("login");

			if (!loginMethod) {
				setHasLoginError(true);
				return;
			}

			if (result.get("signup") === "true") {
				analytics.trackEvent({
					name: "sign_up",
					params: { method: loginMethod },
				});
			}
			analytics.trackEvent({ name: "login", params: { method: loginMethod } });

			window.dispatchEvent(new Event(PANEL_LOGIN_EVENT));
		} catch {
			setHasLoginError(true);
		} finally {
			setPendingProviderId(null);
		}
	};

	if (isNetworkUnavailable) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
				<p className="text-muted-foreground text-sm">
					{I18n.get("login_network_unavailable")}
				</p>
			</div>
		);
	}

	// 패널을 연 사람의 대부분이 이 화면에서 떠났다. 로그인 전에 할 수 있는 일을 먼저 보여준다.
	return (
		<div className="flex h-full flex-col gap-6 overflow-y-auto py-6">
			<div className="flex flex-col gap-1">
				<h2 className="text-balance font-semibold text-lg">
					{I18n.get("login_intro_title")}
				</h2>
				<p className="text-muted-foreground text-sm">
					{I18n.get("login_intro_description")}
				</p>
			</div>

			<figure className="relative m-0 flex flex-col gap-2 rounded-lg border p-3">
				<figcaption className="absolute -top-2 right-3 bg-background px-1 text-muted-foreground text-xs">
					{I18n.get("login_example_label")}
				</figcaption>
				<p className="text-sm">
					{I18n.get("login_example_quote_before")}
					<mark className="box-decoration-clone rounded-sm bg-highlight-yellow px-0.5 text-highlight-yellow-foreground">
						{I18n.get("login_example_quote_highlight")}
					</mark>
					{I18n.get("login_example_quote_after")}
				</p>
				<p className="flex gap-1.5 text-muted-foreground text-xs">
					<PencilLineIcon className="mt-0.5 size-3.5 shrink-0" />
					{I18n.get("login_example_note")}
				</p>
			</figure>

			<ul className="flex flex-col gap-3">
				{LOGIN_BENEFITS.map(({ Icon, titleKey, descriptionKey }) => (
					<li key={titleKey} className="flex items-start gap-3">
						<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
							<Icon className="size-4" />
						</span>
						<span className="flex flex-col text-sm">
							{I18n.get(titleKey)}
							<span className="text-muted-foreground text-xs">
								{I18n.get(descriptionKey)}
							</span>
						</span>
					</li>
				))}
			</ul>

			<div className="mt-auto flex flex-col gap-2">
				{LOGIN_PROVIDERS.map(
					({ id, logo, labelKey, pendingLabelKey, className }) => {
						const isPending = pendingProviderId === id;

						return (
							<Button
								key={id}
								className={`h-10 w-full ${className}`}
								disabled={pendingProviderId !== null}
								onClick={() => handleProviderButtonClick(id)}
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
					<p role="alert" className="text-center text-destructive text-xs">
						{I18n.get("login_failed")}
					</p>
				)}
			</div>
		</div>
	);
}

/** 패널에서 바로 시작할 수 있는 로그인 제공자입니다. */
type TLoginProviderId = "kakao" | "google";

/**
 * 패널에 내놓는 제공자 버튼. 웹의 OAuth 시작 경로가 받는 제공자와 같아야 한다.
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
	id: TLoginProviderId;
	logo: string;
	labelKey: string;
	pendingLabelKey: string;
	className: string;
}>;

/** 로그인하면 할 수 있는 일. 순서는 패널을 연 사람이 가장 먼저 쓸 기능 순이다. */
const LOGIN_BENEFITS = [
	{
		Icon: HighlighterIcon,
		titleKey: "login_benefit_highlight_title",
		descriptionKey: "login_benefit_highlight_description",
	},
	{
		Icon: FileTextIcon,
		titleKey: "login_benefit_organize_title",
		descriptionKey: "login_benefit_organize_description",
	},
	{
		Icon: SearchIcon,
		titleKey: "login_benefit_web_title",
		descriptionKey: "login_benefit_web_description",
	},
] as const;

/**
 * 사용자 확인 쿼리가 네트워크 오류로 끝났는지 본다.
 * @description Supabase `getUser`는 요청 실패를 던지지 않고 `{ error }` 값으로 돌려주므로,
 * 던진 오류와 결과에 담긴 오류를 둘 다 확인한다. `navigator.onLine`이 true여도 DNS·서버에
 * 닿지 못하는 경우를 여기서 잡는다.
 */
const getIsUserCheckNetworkError = (
	userQueryState: QueryState | undefined,
): boolean =>
	isNetworkError(userQueryState?.error) ||
	isNetworkError(getResultError(userQueryState?.data));
