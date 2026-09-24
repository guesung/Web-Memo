/** Web Memo가 소유한 이미지 호스트입니다. */
const ALLOWED_IMAGE_HOSTS = new Set(["webmemo.xyz", "www.webmemo.xyz"]);
/** 검색 공유 이미지의 최대 크기입니다. */
const MAXIMUM_IMAGE_BYTES = 5 * 1024 * 1024;

/** OG 이미지를 실제로 요청해 MIME·크기·해상도를 검사합니다. */
export const inspectSeoImage = async ({
	url,
	fetcher = fetch,
	timeoutMs = 15000,
}) => {
	const asset = {
		url,
		agent: "asset",
		kind: "asset",
		finalUrl: url,
		status: null,
		contentType: "",
		redirects: [],
		issues: [],
	};
	try {
		validateImageUrl(asset.finalUrl);
		for (let hop = 0; hop <= 5; hop += 1) {
			const response = await fetcher(asset.finalUrl, {
				redirect: "manual",
				signal: AbortSignal.timeout(timeoutMs),
			});
			asset.status = response.status;
			asset.contentType = response.headers.get("content-type") ?? "";
			if ([301, 302, 303, 307, 308].includes(response.status)) {
				const location = response.headers.get("location");
				await response.body?.cancel();
				if (!location || hop === 5) {
					throw new Error("이미지 리다이렉트 한도 초과 또는 Location 누락");
				}
				const destination = new URL(location, asset.finalUrl).href;
				validateImageUrl(destination);
				asset.redirects.push({
					url: asset.finalUrl,
					status: response.status,
					destination,
				});
				asset.finalUrl = destination;
				continue;
			}
			const declaredSize = Number(response.headers.get("content-length"));
			if (declaredSize > MAXIMUM_IMAGE_BYTES) {
				asset.byteLength = declaredSize;
				await response.body?.cancel();
				break;
			}
			const buffer = Buffer.from(await response.arrayBuffer());
			asset.byteLength = buffer.byteLength;
			asset.dimensions = parseImageDimensions(buffer, asset.contentType);
			break;
		}
	} catch (error) {
		asset.failure = error instanceof Error ? error.message : String(error);
	}
	asset.issues = evaluateSeoImage(asset);

	return asset;
};

/** 이미지 응답을 SEO 공유 자산 기준으로 판정합니다. */
export const evaluateSeoImage = (asset) => {
	const issues = [];
	const add = (severity, code, message, field) =>
		issues.push({ severity, code, ...(field ? { field } : {}), message });
	if (asset.failure) {
		add("error", "OG_IMAGE_REQUEST_FAILED", `OG 이미지 요청 실패: ${asset.failure}`, "og.image");
		return issues;
	}
	if (asset.status < 200 || asset.status >= 300) {
		add("error", "OG_IMAGE_HTTP_ERROR", `OG 이미지 HTTP ${asset.status}`, "og.image");
	}
	if (!/^image\//i.test(asset.contentType)) {
		add("error", "OG_IMAGE_CONTENT_TYPE_INVALID", `OG 이미지 MIME 불일치: ${asset.contentType || "없음"}`, "og.image");
	}
	if (asset.byteLength > MAXIMUM_IMAGE_BYTES) {
		add("error", "OG_IMAGE_TOO_LARGE", `OG 이미지가 5MB를 초과함: ${asset.byteLength}바이트`, "og.image");
	}
	if (asset.byteLength <= MAXIMUM_IMAGE_BYTES) {
		if (!asset.dimensions) {
			add("error", "OG_IMAGE_DIMENSIONS_UNKNOWN", "OG 이미지 헤더에서 크기를 판독할 수 없음", "og.image");
		} else if (asset.dimensions.width < 200 || asset.dimensions.height < 200) {
			add("error", "OG_IMAGE_DIMENSIONS_TOO_SMALL", `OG 이미지 크기가 200x200 미만: ${asset.dimensions.width}x${asset.dimensions.height}`, "og.image");
		} else if (asset.dimensions.width < 1200 || asset.dimensions.height < 630) {
			add("warning", "OG_IMAGE_DIMENSIONS_SUBOPTIMAL", `OG 이미지 권장 크기 1200x630 미만: ${asset.dimensions.width}x${asset.dimensions.height}`, "og.image");
		}
	}

	return issues;
};

/** PNG·JPEG·WebP·GIF의 최소 헤더로 실제 픽셀 크기를 읽습니다. */
export const parseImageDimensions = (buffer, contentType = "") => {
	if (buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) && buffer.length >= 24) {
		return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
	}
	if (/^GIF8[79]a$/.test(buffer.subarray(0, 6).toString("ascii")) && buffer.length >= 10) {
		return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
	}
	if (buffer[0] === 0xff && buffer[1] === 0xd8) {
		return parseJpegDimensions(buffer);
	}
	if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
		return parseWebpDimensions(buffer);
	}
	if (/image\/(png|jpeg|webp|gif)/i.test(contentType)) {
		return null;
	}

	return null;
};

/** JPEG SOF 마커에서 크기를 읽습니다. */
const parseJpegDimensions = (buffer) => {
	let offset = 2;
	while (offset + 8 < buffer.length) {
		if (buffer[offset] !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = buffer[offset + 1];
		if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
			return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
		}
		const segmentLength = buffer.readUInt16BE(offset + 2);
		if (segmentLength < 2) {
			return null;
		}
		offset += 2 + segmentLength;
	}

	return null;
};

/** WebP VP8X·VP8·VP8L 헤더에서 크기를 읽습니다. */
const parseWebpDimensions = (buffer) => {
	const format = buffer.subarray(12, 16).toString("ascii");
	if (format === "VP8X" && buffer.length >= 30) {
		return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
	}
	if (format === "VP8 " && buffer.length >= 30) {
		return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
	}
	if (format === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
		const bits = buffer.readUInt32LE(21);
		return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
	}

	return null;
};

/** 자산 요청은 Web Memo HTTPS 호스트로만 제한합니다. */
const validateImageUrl = (value) => {
	const url = new URL(value);
	if (url.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
		throw new Error(`허용되지 않은 OG 이미지 URL: ${value}`);
	}
};
