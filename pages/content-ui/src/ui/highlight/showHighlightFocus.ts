import { HIGHLIGHT_COLOR_STYLE } from "@web-memo/shared/constants";

const FOCUS_DURATION_MS = 1000;
const FADE_DURATION_MS = 250;
const SCROLL_SETTLE_LIMIT_MS = 900;

/** 원문 DOM을 수정하지 않고 저장된 인용 범위 위에 잠깐 위치 표시를 그린다. */
export const showHighlightFocus = (range: Range, reducedMotion: boolean) => {
	const host = document.createElement("div");
	host.setAttribute("aria-hidden", "true");
	host.dataset.webMemoHighlightFocus = "";
	host.style.cssText =
		"position:fixed;inset:0;z-index:2147483647;pointer-events:none;opacity:1;";
	const shadow = host.attachShadow({ mode: "open" });
	let frame = 0;
	let fadeTimer = 0;
	let removeTimer = 0;
	let previousTop = Number.NaN;
	let stableFrames = 0;
	const startedAt = performance.now();
	let stopped = false;
	const startContainer = range.startContainer;
	const endContainer = range.endContainer;
	const color = HIGHLIGHT_COLOR_STYLE.yellow;
	const isAnchorConnected = () =>
		startContainer.isConnected && endContainer.isConnected;

	const cleanup = () => {
		stopped = true;
		cancelAnimationFrame(frame);
		clearTimeout(fadeTimer);
		clearTimeout(removeTimer);
		window.removeEventListener("scroll", scheduleRedraw, true);
		window.removeEventListener("resize", scheduleRedraw);
		host.remove();
	};

	const draw = () => {
		if (stopped) return;
		if (!isAnchorConnected()) {
			cleanup();
			return;
		}
		shadow.replaceChildren();
		try {
			for (const rect of range.getClientRects()) {
				if (rect.width <= 0 || rect.height <= 0) continue;
				const outline = document.createElement("span");
				outline.style.cssText =
					"position:absolute;box-sizing:border-box;border:2px solid;border-radius:3px;";
				outline.style.borderColor = color.bar;
				outline.style.backgroundColor = color.background;
				outline.style.boxShadow = `0 0 0 3px ${color.background}`;
				outline.style.left = `${rect.left}px`;
				outline.style.top = `${rect.top}px`;
				outline.style.width = `${rect.width}px`;
				outline.style.height = `${rect.height}px`;
				shadow.append(outline);
			}
		} catch {
			cleanup();
			return;
		}
		if (!shadow.childElementCount) {
			cleanup();
			return;
		}
	};
	const scheduleRedraw = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(draw);
	};
	const show = () => {
		draw();
		if (stopped) return;
		document.documentElement.append(host);
		window.addEventListener("scroll", scheduleRedraw, true);
		window.addEventListener("resize", scheduleRedraw);
		if (!reducedMotion) {
			host.style.transition = `opacity ${FADE_DURATION_MS}ms ease-out`;
			fadeTimer = window.setTimeout(() => {
				host.style.opacity = "0";
			}, FOCUS_DURATION_MS - FADE_DURATION_MS);
		}
		removeTimer = window.setTimeout(cleanup, FOCUS_DURATION_MS);
	};

	const waitForScroll = (now: number) => {
		if (stopped) return;
		if (!isAnchorConnected()) {
			cleanup();
			return;
		}
		let top: number;
		try {
			top = range.getBoundingClientRect().top;
		} catch {
			cleanup();
			return;
		}
		stableFrames = Math.abs(top - previousTop) < 1 ? stableFrames + 1 : 0;
		previousTop = top;
		if (stableFrames >= 2 || now - startedAt >= SCROLL_SETTLE_LIMIT_MS) {
			show();
			return;
		}
		frame = requestAnimationFrame(waitForScroll);
	};
	frame = requestAnimationFrame(waitForScroll);
	return cleanup;
};
