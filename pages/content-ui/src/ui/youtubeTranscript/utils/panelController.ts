import { TRANSCRIPT_CONFIG } from "../config";

const { selectors, timing } = TRANSCRIPT_CONFIG;

function findElement(
	selectorList: readonly string[],
	requireVisible = false,
): HTMLElement | null {
	for (const selector of selectorList) {
		try {
			const element = document.querySelector<HTMLElement>(selector);
			if (element) {
				if (!requireVisible) {
					return element;
				}
				const isVisible =
					element.offsetParent !== null ||
					getComputedStyle(element).display !== "none";
				if (isVisible) {
					return element;
				}
			}
		} catch {
			// Invalid selector, skip
		}
	}
	return null;
}

function waitForElement(
	selectorList: readonly string[],
	timeout: number,
): Promise<HTMLElement> {
	return new Promise((resolve, reject) => {
		const element = findElement(selectorList);
		if (element) {
			resolve(element);
			return;
		}

		const observer = new MutationObserver(() => {
			const found = findElement(selectorList);
			if (found) {
				observer.disconnect();
				resolve(found);
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		setTimeout(() => {
			observer.disconnect();
			reject(new Error("Timeout waiting for element"));
		}, timeout);
	});
}

async function clickElement(element: HTMLElement): Promise<void> {
	element.click();
	await new Promise((resolve) =>
		setTimeout(resolve, timing.buttonClickDelay),
	);
}

async function tryDirectButton(): Promise<boolean> {
	const button = findElement(selectors.transcriptButton);
	if (button) {
		await clickElement(button);
		return true;
	}
	return false;
}

async function tryExpandAndButton(): Promise<boolean> {
	const expandButton = findElement(selectors.expandButton);
	if (expandButton) {
		await clickElement(expandButton);
		await new Promise((resolve) => setTimeout(resolve, 300));

		const transcriptButton = findElement(selectors.transcriptButton);
		if (transcriptButton) {
			await clickElement(transcriptButton);
			return true;
		}
	}
	return false;
}

async function tryThreeDotsMenu(): Promise<boolean> {
	const menuButton = findElement(selectors.threeDotsMenu);
	if (!menuButton) return false;

	await clickElement(menuButton);
	await new Promise((resolve) => setTimeout(resolve, 500));

	// Try standard selectors first
	let menuItem = findElement(selectors.transcriptMenuItem);

	// Fallback: search by text content
	if (!menuItem) {
		const transcriptKeywords = [
			"transcript",
			"스크립트",
			"文字起こし",
			"字幕",
			"transcripción",
			"transcription",
		];
		const menuItems = document.querySelectorAll<HTMLElement>(
			"ytd-menu-service-item-renderer, tp-yt-paper-item",
		);

		for (const item of menuItems) {
			const text = item.textContent?.toLowerCase() || "";
			if (transcriptKeywords.some((keyword) => text.includes(keyword))) {
				menuItem = item;
				break;
			}
		}
	}

	if (menuItem) {
		await clickElement(menuItem);
		return true;
	}

	document.body.click();
	return false;
}

export async function openTranscriptPanel(): Promise<HTMLElement> {
	const existingContainer = findElement(selectors.transcriptContainer, true);
	if (existingContainer) {
		return existingContainer;
	}

	const strategies = [tryDirectButton, tryExpandAndButton, tryThreeDotsMenu];

	for (const strategy of strategies) {
		const success = await strategy();
		if (success) {
			try {
				const container = await waitForElement(
					selectors.transcriptContainer,
					timing.panelLoadTimeout,
				);
				await new Promise((resolve) =>
					setTimeout(resolve, timing.segmentLoadDelay),
				);
				return container;
			} catch {
				continue;
			}
		}
	}

	throw new Error(
		"Failed to open transcript panel. This video may not have a transcript available.",
	);
}

export function isTranscriptPanelOpen(): boolean {
	return findElement(selectors.transcriptContainer, true) !== null;
}

export function closeTranscriptPanel(): void {
	const closeButton = document.querySelector<HTMLElement>(
		'ytd-engagement-panel-section-list-renderer[target-id*="transcript"] #visibility-button button',
	);
	if (closeButton) {
		closeButton.click();
	}
}
