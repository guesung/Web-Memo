import {
	resolveMeasurementClientId,
	sendMeasurementProtocolEvent,
} from "@src/modules/ga/measurementProtocol";
import { after, type NextRequest, NextResponse } from "next/server";

/** 비컨 본문은 `{"cid":"..."}` 하나입니다. 이보다 길면 읽지 않고 cid 없이 처리합니다. */
const MAX_BODY_LENGTH = 256;

const readClientId = async (request: NextRequest): Promise<string | null> => {
	try {
		const body = await request.text();
		if (body.length > MAX_BODY_LENGTH) return null;

		const { cid } = JSON.parse(body) as { cid?: unknown };
		return typeof cid === "string" ? cid : null;
	} catch {
		return null;
	}
};

/**
 * 설치 가이드 페이지가 `navigator.sendBeacon`으로 보낸 로드 신호를 GA4로 옮깁니다.
 *
 * @description 같은 출처로 가는 요청이라 gtag를 막는 광고 차단기에 걸리지 않습니다.
 * gtag의 `install_guide_view`와 겹쳐 세지 않도록 `install_guide_load`라는 다른 이름으로 보냅니다.
 * 비컨은 응답을 기다리지 않지만 함수가 GA 응답까지 붙잡히지 않도록 204를 먼저 돌려줍니다.
 */
export async function POST(request: NextRequest) {
	const clientId = resolveMeasurementClientId(await readClientId(request));

	after(() =>
		sendMeasurementProtocolEvent({
			clientId,
			name: "install_guide_load",
			category: "engagement",
		}),
	);

	return new NextResponse(null, {
		status: 204,
		headers: { "Cache-Control": "no-store" },
	});
}
