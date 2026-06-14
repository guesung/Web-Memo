import { Share } from "react-native";

/**
 * 네이티브 공유 시트를 열어 페이지 제목과 URL을 공유한다.
 * 카카오톡·메모 등 OS가 제공하는 공유 대상이 시트에 자동으로 노출된다.
 */
export async function shareUrl(url: string, title?: string): Promise<void> {
	if (!url) return;
	const message = title ? `${title}\n${url}` : url;
	try {
		await Share.share({ message });
	} catch {}
}
