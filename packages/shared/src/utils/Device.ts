import { isServer } from "./Environment";

function isIOS() {
	if (isServer()) {
		return false;
	}

	return navigator.userAgent.match(/ipad|iphone/i) !== null;
}

function isAndroid() {
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
