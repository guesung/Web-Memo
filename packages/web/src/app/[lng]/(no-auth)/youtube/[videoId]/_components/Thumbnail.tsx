import Image from "next/image";

interface ThumbnailProps {
	thumbnailUrl: string | null;
	title: string;
	videoId: string;
}

export default function Thumbnail({
	thumbnailUrl,
	title,
	videoId,
}: ThumbnailProps) {
	const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
	const imageUrl = thumbnailUrl || defaultThumbnail;

	return (
		<div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100 mb-6">
			<Image
				src={imageUrl}
				alt={title}
				fill
				className="object-cover"
				sizes="(max-width: 768px) 100vw, 800px"
				priority
			/>
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/90 shadow-lg">
					<svg
						className="h-8 w-8 text-white ml-1"
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M8 5v14l11-7z" />
					</svg>
				</div>
			</div>
		</div>
	);
}
