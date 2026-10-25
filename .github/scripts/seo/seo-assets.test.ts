import { describe, expect, it, vi } from "vitest";
import { inspectSeoImage, parseImageDimensions } from "./seo-assets.mjs";

const createPng = (width: number, height: number) => {
	const image = Buffer.alloc(24);
	Buffer.from("89504e470d0a1a0a", "hex").copy(image);
	image.writeUInt32BE(width, 16);
	image.writeUInt32BE(height, 20);

	return image;
};

describe("OG 이미지 검사", () => {
	it.each([
		[199, 300, "error", "OG_IMAGE_DIMENSIONS_TOO_SMALL"],
		[600, 315, "warning", "OG_IMAGE_DIMENSIONS_SUBOPTIMAL"],
		[1200, 630, undefined, undefined],
	])(
		"PNG %sx%s 크기를 판정한다",
		async (width, height, severity, code) => {
			const result = await inspectSeoImage({
				url: "https://www.webmemo.xyz/og.png",
				fetcher: async () =>
					new Response(createPng(width as number, height as number), {
						headers: { "content-type": "image/png" },
					}),
			});

			expect(result.dimensions).toEqual({ width, height });
			if (code) {
				expect(result.issues).toContainEqual(
					expect.objectContaining({ severity, code }),
				);
			} else {
				expect(result.issues).toEqual([]);
			}
		},
	);

	it("외부 호스트와 외부 호스트로 향하는 리다이렉트를 차단한다", async () => {
		const direct = await inspectSeoImage({
			url: "https://example.com/og.png",
			fetcher: vi.fn(),
		});
		const redirected = await inspectSeoImage({
			url: "https://www.webmemo.xyz/og.png",
			fetcher: async () =>
				new Response(null, {
					status: 302,
					headers: { location: "https://example.com/og.png" },
				}),
		});

		expect(direct.issues[0].code).toBe("OG_IMAGE_REQUEST_FAILED");
		expect(redirected.issues[0].code).toBe("OG_IMAGE_REQUEST_FAILED");
	});

	it("Content-Length가 5MB를 초과하면 본문 해상도를 읽지 않고 용량 오류를 남긴다", async () => {
		const result = await inspectSeoImage({
			url: "https://www.webmemo.xyz/large.png",
			fetcher: async () =>
				new Response(createPng(1200, 630), {
					headers: {
						"content-length": String(6 * 1024 * 1024),
						"content-type": "image/png",
					},
				}),
		});

		expect(result.dimensions).toBeUndefined();
		expect(result.issues).toEqual([
			expect.objectContaining({ code: "OG_IMAGE_TOO_LARGE" }),
		]);
	});

	it("GIF·JPEG·WebP 최소 헤더의 픽셀 크기를 읽는다", () => {
		const gif = Buffer.alloc(10);
		gif.write("GIF89a");
		gif.writeUInt16LE(320, 6);
		gif.writeUInt16LE(240, 8);
		const jpeg = Buffer.from([
			0xff, 0xd8, 0xff, 0xc0, 0x00, 0x08, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x00,
		]);
		const webp = Buffer.alloc(30);
		webp.write("RIFF", 0);
		webp.write("WEBP", 8);
		webp.write("VP8X", 12);
		webp.writeUIntLE(1199, 24, 3);
		webp.writeUIntLE(629, 27, 3);

		expect(parseImageDimensions(gif)).toEqual({ width: 320, height: 240 });
		expect(parseImageDimensions(jpeg)).toEqual({ width: 640, height: 480 });
		expect(parseImageDimensions(webp)).toEqual({ width: 1200, height: 630 });
	});
});
