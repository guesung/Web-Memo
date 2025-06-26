/**
 * HSL 색상값을 RGB로 변환하는 헬퍼 함수
 */
const hue2rgb = (p: number, q: number, t: number) => {
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
};

/**
 * RGB 값을 16진수로 변환하는 헬퍼 함수
 */
const toHex = (x: number) => {
	const hex = Math.round(x * 255).toString(16);
	return hex.length === 1 ? "0" + hex : hex;
};

/**
 * HSL을 HEX 색상 코드로 변환하는 함수
 */
const hslToHex = (h: number, s: number, l: number) => {
	const hue = h / 360;
	const saturation = s / 100;
	const lightness = l / 100;

	let r: number, g: number, b: number;
	if (saturation === 0) {
		r = g = b = lightness;
	} else {
		const q =
			lightness < 0.5
				? lightness * (1 + saturation)
				: lightness + saturation - lightness * saturation;
		const p = 2 * lightness - q;

		r = hue2rgb(p, q, hue + 1 / 3);
		g = hue2rgb(p, q, hue);
		b = hue2rgb(p, q, hue - 1 / 3);
	}

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * 랜덤 파스텔 색상을 생성하는 함수
 * @returns HEX 색상 코드 (예: #FF5733)
 */
export const generateRandomPastelColor = () => {
	// Hue: 0-360 (색상)
	// Saturation: 60-80% (파스텔톤을 위해 중간 채도)
	// Lightness: 70-85% (파스텔톤을 위해 높은 명도)
	const hue = Math.floor(Math.random() * 360);
	const saturation = Math.floor(Math.random() * 20) + 60; // 60-80%
	const lightness = Math.floor(Math.random() * 15) + 70; // 70-85%

	return hslToHex(hue, saturation, lightness);
};
