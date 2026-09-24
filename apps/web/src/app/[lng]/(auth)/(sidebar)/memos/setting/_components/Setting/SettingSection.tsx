"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@web-memo/ui";
import type { PropsWithChildren } from "react";

/** 설정 카드 제목과 적용 범위를 설명합니다. */
interface IFSettingSectionProps extends PropsWithChildren {
	title: string;
	/** 카드 하나가 무엇을 묶고 있는지 한 줄로 설명한다. 자명하면 넘기지 않는다 */
	description?: string;
	headingLevel?: "h2" | "h3";
}

/**
 * 설정 화면의 카드 한 장. 의미가 같은 설정들을 묶는다.
 *
 * @description 예전에는 다섯 섹션이 구분선도 그룹명도 없이 평평하게 놓여 있었고, 정렬 방식이
 * 한 화면에 세 가지 섞여 있었다. 그 정렬을 이 카드와 SettingRow 한 쌍으로 흡수한다.
 */
const SettingSection = (props: IFSettingSectionProps) => {
	const Heading = props.headingLevel ?? "h2";

	return (
		<Card>
			<CardHeader className="p-4 pb-2">
				<CardTitle asChild className="text-base">
					<Heading>{props.title}</Heading>
				</CardTitle>
				{props.description && (
					<p className="text-xs text-muted-foreground">{props.description}</p>
				)}
			</CardHeader>
			<CardContent className="flex flex-col gap-4 p-4 pt-2">
				{props.children}
			</CardContent>
		</Card>
	);
};

export default SettingSection;
