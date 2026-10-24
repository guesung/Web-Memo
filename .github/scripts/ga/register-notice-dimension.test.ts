// @ts-nocheck — .mjs GA Admin API 호출을 모의합니다.
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("../shared/google-auth.mjs", () => ({ exchangeServiceAccountToken: vi.fn(async () => "token") }));
vi.mock("../shared/http.mjs", () => ({ requestJson: vi.fn() }));

import { exchangeServiceAccountToken } from "../shared/google-auth.mjs";
import { requestJson } from "../shared/http.mjs";
import { registerNoticeDimension } from "./register-notice-dimension.mjs";

const options = { propertyId: "471860782", serviceAccountJson: "{}" };

beforeEach(() => vi.clearAllMocks());

it("기존 이벤트 차원을 재사용하고 생성하지 않는다", async () => {
	requestJson.mockResolvedValueOnce({ customDimensions: [{ name: "properties/471860782/customDimensions/1", parameterName: "notice_id", scope: "EVENT" }] });
	expect(await registerNoticeDimension(options)).toEqual({ status: "already_registered", name: "properties/471860782/customDimensions/1" });
	expect(requestJson).toHaveBeenCalledOnce();
	expect(exchangeServiceAccountToken).toHaveBeenCalledWith({ serviceAccount: {}, scope: "https://www.googleapis.com/auth/analytics.edit" });
});

it("없으면 이벤트 차원을 만들고 목록에서 재확인한다", async () => {
	const dimension = { name: "properties/471860782/customDimensions/2", parameterName: "notice_id", scope: "EVENT" };
	requestJson.mockResolvedValueOnce({ customDimensions: [] })
		.mockResolvedValueOnce(dimension)
		.mockResolvedValueOnce({ customDimensions: [dimension] });
	expect(await registerNoticeDimension(options)).toEqual({ status: "created", name: dimension.name });
	expect(requestJson.mock.calls[1][1]).toMatchObject({ method: "POST" });
	expect(JSON.parse(requestJson.mock.calls[1][1].body)).toMatchObject({ parameterName: "notice_id", scope: "EVENT" });
});
