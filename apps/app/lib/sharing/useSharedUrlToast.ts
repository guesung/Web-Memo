import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { handleSharedUrl } from "@/lib/sharing/shareHandler";

/**
 * 공유받은 URL을 처리하고 결과를 토스트 문구로 보여준다.
 * @description iOS 공유 확장·Android ShareActivity가 여는 `webmemo://share` 딥링크
 * (app/share.tsx)가 이 훅을 쓴다. 후보 선택이 필요해 저장하지 못했는지는 호출한 쪽이
 * 반환값으로 판단해 브라우저로 이동시킨다.
 */
export function useSharedUrlToast() {
	const queryClient = useQueryClient();
	const [toast, setToast] = useState<string | null>(null);
	const processingUrlRef = useRef<string | null>(null);

	const processSharedUrl = async (url: string, title?: string) => {
		if (processingUrlRef.current === url) {
			return null;
		}
		processingUrlRef.current = url;

		try {
			const result = await handleSharedUrl(url, title);
			queryClient.invalidateQueries({ queryKey: ["memos"] });
			queryClient.invalidateQueries({ queryKey: ["localMemos"] });
			setToast(
				result.saved
					? "위시리스트에 추가되었습니다"
					: "메모를 선택해 주세요. 공유 요청은 보관했습니다",
			);
			return result;
		} catch {
			setToast("저장에 실패했습니다");
			return null;
		} finally {
			processingUrlRef.current = null;
			setTimeout(() => setToast(null), 3000);
		}
	};

	return { toast, processSharedUrl };
}
