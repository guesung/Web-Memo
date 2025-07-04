import { CONFIG } from "@web-memo/env";
import { Tab } from "@web-memo/shared/utils/extension";
import { ExternalLinkIcon } from "lucide-react";

export default function LoginSection() {
	return (
		<div className="flex h-full flex-col items-center justify-center">
			<p>메모 기능을 이용하려면 로그인이 필요합니다.</p>
			<button
				type="button"
				className="flex cursor-pointer items-center gap-2"
				onClick={() => {
					Tab.create({ url: `${CONFIG.webUrl}/login` });
				}}
			>
				로그인하러가기
				<ExternalLinkIcon height={16} width={16} />
			</button>
		</div>
	);
}
