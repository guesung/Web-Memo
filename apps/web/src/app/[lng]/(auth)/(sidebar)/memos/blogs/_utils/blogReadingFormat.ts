import dayjs from "dayjs";

/** 게시일을 `2021.04.28` 형태로 바꾼다. 공급자가 게시일을 주지 않으면 null이다. */
export const formatBlogArticleDate = (
	publishedAt: string | null,
): string | null => {
	if (!publishedAt) {
		return null;
	}

	return dayjs(publishedAt).format("YYYY.MM.DD");
};

/** 날짜와 시각을 언어에 맞는 짧은 형태로 바꾼다. */
export const formatBlogDateTime = ({
	isoString,
	lng,
}: {
	isoString: string;
	lng: string;
}): string =>
	new Date(isoString).toLocaleString(lng, {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
