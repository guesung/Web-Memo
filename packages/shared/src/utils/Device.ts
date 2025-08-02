import { isServer } from "./Environment";

export function isIOS() {
	if (isServer()) {
		return false;
	}

	return navigator.userAgent.match(/ipad|iphone/i) !== null;
}

export function isAndroid() {
	if (isServer()) {
		return false;
	}

	return navigator.userAgent.match(/Android/i) !== null;
}

export function isMobile() {
	if (isIOS() || isAndroid()) {
		return true;
	}
	return false;
}
