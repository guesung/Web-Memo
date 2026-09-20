import { captureRequestError } from "@sentry/nextjs";

export async function register() {
	if (process.env.NEXT_RUNTIME === "nodejs") {
		await import("./sentry.server.config");
	}

	if (process.env.NEXT_RUNTIME === "edge") {
		await import("./sentry.edge.config");
	}

	if (process.env.NEXT_RUNTIME === "server") {
		await import("./sentry.server.config");
	}
}

/**
 * 서버에서 처리되지 않은 요청 오류를 Sentry에 보고한다.
 *
 * @description Next는 Server Component 렌더, 서버 액션, 라우트 핸들러에서 잡히지 않은 오류를 이 hook으로 넘긴다.
 * 프로덕션의 브라우저에는 메시지와 스택이 지워진 `digest`만 전달되므로, 원인은 여기서 보고해야 남는다.
 */
export const onRequestError = captureRequestError;
