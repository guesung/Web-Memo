import type { IFPastMemoRelated } from "@web-memo/shared/types";
import { I18n } from "@web-memo/shared/utils/extension";
import { GlobeIcon } from "lucide-react";
import { useState } from "react";

/**
 * 과거 메모 배너의 관련 메모 한 행. 행 전체가 열기 버튼이다.
 * @description 파비콘이 없거나 불러오지 못하면 지구본 아이콘으로 대신한다. 도메인은 행의 title 속성으로 보여 준다.
 * 현재 사용처: PastMemoNotice.tsx
 */
const PastMemoNoticeItem = (props: IFPastMemoNoticeItemProps) => {
	const [isFavIconBroken, setIsFavIconBroken] = useState(false);

	const isFavIconVisible = !!props.relatedMemo.favIconUrl && !isFavIconBroken;

	return (
		<li>
			<button
				type="button"
				title={getHostname(props.relatedMemo.url)}
				onClick={props.onItemClick}
				className="focus-visible:ring-ring flex w-full min-w-0 items-center gap-2 rounded-sm py-1 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-1"
			>
				{isFavIconVisible ? (
					<img
						src={props.relatedMemo.favIconUrl ?? undefined}
						alt=""
						className="size-4 shrink-0"
						onError={() => setIsFavIconBroken(true)}
					/>
				) : (
					<GlobeIcon
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
				)}
				<span className="min-w-0 flex-1 truncate">
					{props.relatedMemo.title}
				</span>
				{props.relatedMemo.updatedAt && (
					<span className="shrink-0 text-muted-foreground">
						{formatRelativeDate(props.relatedMemo.updatedAt)}
					</span>
				)}
			</button>
		</li>
	);
};

export default PastMemoNoticeItem;

/** 큰 단위부터 비교해 처음으로 1 이상이 되는 단위로 표기한다. 웹 메모 목록(dayjs fromNow)처럼 상대 시간이다. */
const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 60 * 60 * 24 * 365],
	["month", 60 * 60 * 24 * 30],
	["week", 60 * 60 * 24 * 7],
	["day", 60 * 60 * 24],
	["hour", 60 * 60],
	["minute", 60],
];

const formatRelativeDate = (isoDate: string) => {
	const elapsedSeconds = (new Date(isoDate).getTime() - Date.now()) / 1000;

	if (Number.isNaN(elapsedSeconds)) {
		return "";
	}

	const formatter = new Intl.RelativeTimeFormat(I18n.getUILanguage(), {
		numeric: "auto",
	});
	const matchedUnit = RELATIVE_TIME_UNITS.find(
		([, unitSeconds]) => Math.abs(elapsedSeconds) >= unitSeconds,
	);

	if (!matchedUnit) {
		return formatter.format(0, "minute");
	}

	return formatter.format(
		Math.round(elapsedSeconds / matchedUnit[1]),
		matchedUnit[0],
	);
};

const getHostname = (url: string) => {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
};

/** PastMemoNoticeItem props */
interface IFPastMemoNoticeItemProps {
	/** 보여 줄 관련 메모 */
	relatedMemo: IFPastMemoRelated;
	/** 행을 눌렀을 때. 메모를 남긴 원래 사이트를 새 탭으로 연다 */
	onItemClick: () => void;
}
