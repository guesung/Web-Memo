import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** 빈 구독·로그인 필요·첫 수집 실패처럼 화면 가운데에 안내와 행동 하나를 보여 주는 상태. */
export default function BlogReadingStateMessage({
	icon: Icon,
	title,
	description,
	children,
}: IFBlogReadingStateMessageProps) {
	return (
		<output className="flex min-h-[320px] flex-col items-center justify-center gap-2 px-4 py-12 text-center">
			<Icon className="h-7 w-7 text-muted-foreground" aria-hidden />
			<h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
			<p className="mb-4 max-w-sm text-muted-foreground">{description}</p>
			{children}
		</output>
	);
}

/** 상태 안내의 아이콘·제목·설명과 행동 버튼(children). */
interface IFBlogReadingStateMessageProps {
	icon: LucideIcon;
	title: string;
	description: string;
	children?: ReactNode;
}
