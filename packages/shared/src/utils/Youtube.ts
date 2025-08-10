export const checkVideoId = (input: string): boolean =>
	/^[a-zA-Z0-9_-]{11}$/.test(input);
export const youtubeURLPatterns = [
	/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
	/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
];
export const checkYoutubeUrl = (input: string): boolean =>
	youtubeURLPatterns.some((pattern) => pattern.test(input));

export const extractVideoId = (input: string): string | null => {
	if (checkVideoId(input)) return input;
	if (checkYoutubeUrl(input))
		return input.match(youtubeURLPatterns[0])?.[1] || null;
	return null;
};
