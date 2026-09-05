import { CONFIG } from "@web-memo/env";
import { analytics } from "@web-memo/shared/modules/analytics";
import { Tab } from "@web-memo/shared/utils/extension";
import { ExternalLinkIcon } from "lucide-react";

export default function LoginSection() {
	/**
	 * 로그인 탭을 엽니다.
	 * @description 확장의 client_id를 쿼리로 실어 보냅니다. 사이드패널은 비로그인이고
	 * 로그인은 웹 탭에서 끝나는데, 확장과 웹은 서로 다른 식별자를 써서 그냥 두면
	 * "사이드패널까지 왔다가 가입하지 않은 사람"을 셀 수 없습니다.
	 */
	const handleLoginButtonClick = async () => {
		analytics.trackEvent({
			name: "login_start",
			params: { surface: "side_panel" },
		});

		const clientId = await analytics.getExtensionClientId();
		const loginUrl = new URL(`${CONFIG.webUrl}/login`);

		if (clientId) loginUrl.searchParams.set("ext_cid", clientId);

		Tab.create({ url: loginUrl.toString() });
	};

	return (
		<div className="flex h-full flex-col items-center justify-center">
			<p>메모 기능을 이용하려면 로그인이 필요합니다.</p>
			<button
				type="button"
				className="flex cursor-pointer items-center gap-2"
				onClick={handleLoginButtonClick}
			>
				로그인하러가기
				<ExternalLinkIcon height={16} width={16} />
			</button>
		</div>
	);
}
