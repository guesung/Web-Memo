"use client";

import { Label } from "@web-memo/ui";
import type { PropsWithChildren } from "react";

interface IFSettingRowProps extends PropsWithChildren {
	label: string;
	/** 이 설정이 무엇을 바꾸는지. 라벨만으로 충분하면 넘기지 않는다 */
	description?: string;
	/** 오른쪽 컨트롤의 id. 넘기면 라벨을 눌러도 컨트롤이 반응한다 */
	htmlFor?: string;
}

/**
 * 설정 한 줄. 좌측에 라벨과 설명, 우측에 컨트롤을 둔다.
 *
 * @description 모바일에서는 세로로 접혀 컨트롤이 전폭을 쓴다. 좁은 화면에서 라벨과 컨트롤을
 * 한 줄에 두면 Select 같은 컨트롤이 먼저 찌그러진다.
 */
export default function SettingRow({
	label,
	description,
	htmlFor,
	children,
}: IFSettingRowProps) {
	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
			<div className="min-w-0 space-y-0.5">
				<Label htmlFor={htmlFor}>{label}</Label>
				{description && (
					<p className="text-xs text-muted-foreground">{description}</p>
				)}
			</div>
			<div className="shrink-0 max-sm:w-full">{children}</div>
		</div>
	);
}
