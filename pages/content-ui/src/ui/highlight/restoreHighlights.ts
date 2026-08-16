import {
	type HighlightItem,
	type HighlightRenderer,
	resolveAnchors,
} from "@web-memo/shared/modules/highlight";

/** 늦게 그려지는 본문을 기다리는 한계. 이후에는 옵저버를 해제한다 */
export const RESTORE_TIMEOUT_MS = 10_000;

/** DOM 변경이 몰아칠 때 재시도를 모으는 간격 */
export const RETRY_DEBOUNCE_MS = 300;

/** startHighlightRestore에 전달하는 인자 */
interface StartHighlightRestoreParams {
	/** 복원할 하이라이트 목록 */
	items: HighlightItem[];
	/** 밑줄을 그릴 렌더러 */
	renderer: HighlightRenderer;
	/** 탐색 기준 노드 */
	root?: Node;
	/** 이 시간이 지나면 못 찾은 앵커를 포기하고 옵저버를 해제한다 */
	timeoutMs?: number;
	/** DOM 변경 후 재시도까지의 대기 시간 */
	debounceMs?: number;
}

/**
 * 저장된 하이라이트를 현재 문서에 복원한다.
 * @description 즉시 한 번 시도하고, 못 찾은 앵커가 남으면 DOM 변경을 관찰해 그것들만 다시
 * 시도한다. 요즘 페이지는 본문을 나중에 그리기 때문이다. 남의 페이지에 도는 코드를 남기지
 * 않도록 전부 찾으면 즉시, 못 찾아도 `timeoutMs` 뒤에는 반드시 옵저버를 해제한다.
 * 재시도는 `resolveAnchors`로 문서를 한 번만 훑는다.
 * @returns 정리 함수. 호출하면 옵저버와 타이머를 즉시 해제한다.
 */
export function startHighlightRestore({
	items,
	renderer,
	root = document.body,
	timeoutMs = RESTORE_TIMEOUT_MS,
	debounceMs = RETRY_DEBOUNCE_MS,
}: StartHighlightRestoreParams): () => void {
	let pending = [...items];
	let observer: MutationObserver | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

	function stop(): void {
		observer?.disconnect();
		observer = null;

		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}

		if (timeoutTimer !== null) {
			clearTimeout(timeoutTimer);
			timeoutTimer = null;
		}
	}

	/** 아직 못 찾은 앵커만 다시 시도하고, 찾은 것은 pending에서 뺀다 */
	function attempt(): void {
		const ranges = resolveAnchors(
			pending.map((item) => item.anchor),
			root,
		);
		const stillPending: HighlightItem[] = [];

		pending.forEach((item, itemIndex) => {
			const range = ranges[itemIndex];

			if (range) {
				renderer.add(item.id, range, item.color);
				return;
			}

			stillPending.push(item);
		});

		pending = stillPending;
	}

	if (items.length === 0) {
		return stop;
	}

	attempt();

	if (pending.length === 0) {
		return stop;
	}

	observer = new MutationObserver(() => {
		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			attempt();

			if (pending.length === 0) {
				stop();
			}
		}, debounceMs);
	});

	observer.observe(root, {
		childList: true,
		subtree: true,
		characterData: true,
	});

	timeoutTimer = setTimeout(stop, timeoutMs);

	return stop;
}
