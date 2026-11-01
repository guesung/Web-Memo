import type { MouseEvent } from "react";
import { type MemoBodyLine, parseMemoBody } from "./memoBodyFormat";

interface MemoBodyTextProps {
	text: string;
}

// 본문 폰트(Pretendard)에서 잰 글자 폭(em). 숫자는 폭이 제각각이라 좁은 1만 따로 둔다.
const MARKER_CHAR_WIDTH_EM: Record<string, number> = {
	"1": 0.37,
	".": 0.27,
	")": 0.4,
	"-": 0.42,
	"*": 0.46,
	"•": 0.45,
};
const DIGIT_WIDTH_EM = 0.58;
const SPACE_WIDTH_EM = 0.26;

/** 글머리 뒤 공백까지의 폭. 둘째 줄부터 본문 첫 글자에 맞춘다. */
const getHangingIndent = (marker: string) => {
	const markerWidth = Array.from(marker).reduce(
		(width, char) => width + (MARKER_CHAR_WIDTH_EM[char] ?? DIGIT_WIDTH_EM),
		0,
	);
	return `${(markerWidth + SPACE_WIDTH_EM).toFixed(2)}em`;
};

// 링크를 눌러도 카드가 열리지 않게 한다. 카드는 클릭으로 다이얼로그를 연다.
const stopCardOpen = (event: MouseEvent<HTMLAnchorElement>) => {
	event.stopPropagation();
};

const MemoBodyLineContent = ({ line }: { line: MemoBodyLine }) => {
	if (line.segments.length === 0) {
		return <br />;
	}

	return line.segments.map((segment, index) =>
		segment.type === "link" ? (
			<a
				// biome-ignore lint/suspicious/noArrayIndexKey: 줄 안의 조각 순서는 바뀌지 않는다
				key={index}
				href={segment.href}
				target="_blank"
				rel="noopener noreferrer"
				onClick={stopCardOpen}
				className="text-primary underline underline-offset-2"
			>
				{segment.href}
			</a>
		) : (
			// biome-ignore lint/suspicious/noArrayIndexKey: 줄 안의 조각 순서는 바뀌지 않는다
			<span key={index}>{segment.text}</span>
		),
	);
};

/** 목록 카드의 메모 본문. URL은 새 탭 링크로, 글머리 줄은 둘째 줄부터 들여쓴다. */
export default function MemoBodyText({ text }: MemoBodyTextProps) {
	return parseMemoBody(text).map((line, index) => (
		<span
			// biome-ignore lint/suspicious/noArrayIndexKey: 줄 순서는 본문 그대로다
			key={index}
			className="block"
			style={
				line.marker
					? {
							paddingLeft: getHangingIndent(line.marker),
							textIndent: `-${getHangingIndent(line.marker)}`,
						}
					: undefined
			}
		>
			<MemoBodyLineContent line={line} />
		</span>
	));
}
