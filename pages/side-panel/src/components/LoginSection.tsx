import { CONFIG } from "@web-memo/env";
import { Tab } from "@web-memo/shared/utils/extension";
import { Button } from "@web-memo/ui";
import { ExternalLinkIcon } from "lucide-react";

/**
 * 로그인이 필요할 때 메모 영역 자리에 대신 보여주는 안내
 *
 * @description
 * MemoSection 의 ErrorBoundary 폴백으로도 쓰이므로 props 를 받지 않는다.
 */
export default function LoginSection() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
			<p className="text-muted-foreground text-sm">
				메모 기능을 이용하려면 로그인이 필요합니다.
			</p>
			<Button
				variant="outline"
				size="sm"
				onClick={() => {
					Tab.create({ url: `${CONFIG.webUrl}/login` });
				}}
			>
				로그인하러가기
				<ExternalLinkIcon />
			</Button>
		</div>
	);
}
