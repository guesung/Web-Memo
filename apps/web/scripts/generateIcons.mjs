import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * 확장·웹 아이콘 PNG와 favicon.ico를 SVG 원본에서 생성한다.
 *
 * 사용: node scripts/generateIcons.mjs
 *
 * - 128·48·34·32는 8배 크기로 그린 뒤 LANCZOS로 줄인다.
 * - 16px은 흐려지지 않도록 픽셀 격자에 맞춘 전용 SVG를 그대로 그린다.
 * - 원본: `scripts/icons/icon.svg`(128 기준), `scripts/icons/icon-16.svg`(16px 전용)
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const SUPERSAMPLE = 8;
const SVG_BASE_SIZE = 128;

const iconSvg = readFileSync(resolve(here, "icons/icon.svg"));
const icon16Svg = readFileSync(resolve(here, "icons/icon-16.svg"));

/** SVG를 8배로 그린 뒤 LANCZOS로 줄인 PNG 버퍼를 만든다. */
const renderSupersampled = (size) => {
	const largeSize = size * SUPERSAMPLE;

	return sharp(iconSvg, { density: (72 * largeSize) / SVG_BASE_SIZE })
		.resize(largeSize, largeSize)
		.resize(size, size, { kernel: "lanczos3" })
		.png()
		.toBuffer();
};

/** 16px 전용 SVG를 격자 그대로 그린 PNG 버퍼를 만든다. */
const renderPixel16 = () => sharp(icon16Svg).resize(16, 16).png().toBuffer();

const renderIcon = (size) =>
	size === 16 ? renderPixel16() : renderSupersampled(size);

/** PNG 이미지를 담은 멀티 사이즈 ICO 파일을 만든다. */
const buildIco = (images) => {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(images.length, 4);

	let offset = 6 + images.length * 16;
	const entries = images.map(({ size, data }) => {
		const entry = Buffer.alloc(16);
		entry.writeUInt8(size, 0);
		entry.writeUInt8(size, 1);
		entry.writeUInt16LE(1, 4);
		entry.writeUInt16LE(32, 6);
		entry.writeUInt32LE(data.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += data.length;
		return entry;
	});

	return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
};

const write = (relativePath, data) => {
	const target = resolve(repoRoot, relativePath);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, data);
	console.log(`wrote ${relativePath}`);
};

const png = Object.fromEntries(
	await Promise.all(
		[16, 34, 48, 128].map(async (size) => [size, await renderIcon(size)]),
	),
);

for (const size of [16, 34, 48, 128]) {
	write(`apps/chrome-extension/public/icon-${size}.png`, png[size]);
}
write("apps/web/public/images/pngs/icon.png", png[34]);
write("pages/content-ui/public/logo.png", png[34]);

const faviconImages = await Promise.all(
	[16, 32, 48].map(async (size) => ({ size, data: await renderIcon(size) })),
);
write("apps/web/src/app/favicon.ico", buildIco(faviconImages));
