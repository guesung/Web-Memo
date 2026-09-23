import { useNoticeQuery } from "@web-memo/shared/hooks";
import { analytics } from "@web-memo/shared/modules/analytics";
import {
	ChromeSyncStorage,
	STORAGE_KEYS,
} from "@web-memo/shared/modules/chrome-storage";
import { useEffect, useRef, useState } from "react";
import { reportSidePanelError } from "../../utils";

/**
 * 사이드 패널에 보여줄 공지와 닫기 핸들러를 돌려준다.
 * @description 공지가 없거나·로딩 중·조회 실패·이미 닫은 공지·닫은 목록을 아직 못 읽은 경우 notice는 null이다.
 * 공지가 보이면 notice_view를 공지 id당 한 번만 보낸다. 조회 실패 보고는 QueryProvider의 QueryCache가 맡는다.
 */
export default function useNoticeBanner() {
	const { data: notice } = useNoticeQuery();
	const dismissedNoticeIds = useDismissedNoticeIds();
	const [locallyDismissedNoticeId, setLocallyDismissedNoticeId] = useState<
		number | null
	>(null);
	const viewTrackedNoticeIdsRef = useRef(new Set<number>());

	const isNoticeVisible =
		!!notice &&
		!!dismissedNoticeIds &&
		!dismissedNoticeIds.includes(notice.id) &&
		locallyDismissedNoticeId !== notice.id;
	const visibleNotice = isNoticeVisible ? notice : null;
	const visibleNoticeId = visibleNotice?.id;

	useEffect(() => {
		if (visibleNoticeId === undefined) {
			return;
		}
		if (viewTrackedNoticeIdsRef.current.has(visibleNoticeId)) {
			return;
		}

		viewTrackedNoticeIdsRef.current.add(visibleNoticeId);
		analytics.trackEvent({
			name: "notice_view",
			params: { notice_id: visibleNoticeId },
		});
	}, [visibleNoticeId]);

	const handleNoticeDismiss = async () => {
		if (!visibleNotice || !dismissedNoticeIds) {
			return;
		}

		const noticeId = visibleNotice.id;
		setLocallyDismissedNoticeId(noticeId);
		analytics.trackEvent({
			name: "notice_dismiss",
			params: { notice_id: noticeId },
		});

		try {
			const storedNoticeIds =
				(await ChromeSyncStorage.get<number[] | undefined>(
					STORAGE_KEYS.dismissedNoticeIds,
				)) ?? dismissedNoticeIds;
			const nextNoticeIds = Array.from(new Set([...storedNoticeIds, noticeId]));
			await ChromeSyncStorage.set(
				STORAGE_KEYS.dismissedNoticeIds,
				nextNoticeIds,
			);
		} catch (error) {
			/** 저장에 실패해도 이 패널에서는 숨긴 채 두고, 다음에 열면 다시 보인다. */
			reportSidePanelError({
				error,
				feature: "notice",
				operation: "dismiss",
				stage: "storage",
				level: "warning",
			});
		}
	};

	return { notice: visibleNotice, handleNoticeDismiss };
}

/** 닫은 공지 id 목록을 sync 저장소에서 읽고 구독한다. 아직 못 읽었으면 null이다. */
const useDismissedNoticeIds = () => {
	const [dismissedNoticeIds, setDismissedNoticeIds] = useState<number[] | null>(
		null,
	);

	useEffect(() => {
		let isStopped = false;
		const readDismissedNoticeIds = async () => {
			try {
				const storedNoticeIds = await ChromeSyncStorage.get<
					number[] | undefined
				>(STORAGE_KEYS.dismissedNoticeIds);
				if (isStopped) {
					return;
				}
				setDismissedNoticeIds(storedNoticeIds ?? []);
			} catch {
				/** 읽지 못하면 이미 닫은 공지를 다시 띄우지 않도록 숨긴 채 둔다. */
			}
		};
		void readDismissedNoticeIds();
		const unsubscribe = ChromeSyncStorage.subscribe<number[]>(
			STORAGE_KEYS.dismissedNoticeIds,
			(value) => setDismissedNoticeIds(value ?? []),
		);

		return () => {
			isStopped = true;
			unsubscribe();
		};
	}, []);

	return dismissedNoticeIds;
};
