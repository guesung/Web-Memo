"use client";

import { CheckIcon } from "lucide-react";
import { useInstallGuideProgress } from "./installGuideProgress";

/**
 * 설치 가이드의 세 단계. 패널이 열리면 1단계를 완료로 바꾸고 강조를 2단계로 옮긴다.
 * @description 3단계(로그인 뒤 메모)는 이 페이지에서 로그인 완료를 알 수 없어 넘기지 않는다.
 */
export function InstallGuideSteps({
	steps,
	completedLabel,
}: InstallGuideStepsProps) {
	const { isPanelOpen } = useInstallGuideProgress();
	const activeIndex = isPanelOpen ? 1 : 0;

	return (
		<ol className="flex flex-col gap-3 md:col-span-2">
			{steps.map((step, index) => {
				const isCompleted = index < activeIndex;

				return (
					<li
						key={step.title}
						aria-current={index === activeIndex ? "step" : undefined}
						className={`flex gap-4 rounded-lg border bg-card p-5 transition-opacity ${index === activeIndex ? "border-primary" : "border-border"} ${isCompleted ? "opacity-60" : ""}`}
					>
						<span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
							{isCompleted ? (
								<CheckIcon className="size-4" aria-label={completedLabel} />
							) : (
								index + 1
							)}
						</span>
						<div>
							<h2 className="mb-2 text-base font-semibold">{step.title}</h2>
							<p className="text-sm leading-relaxed text-muted-foreground">
								{step.description}
							</p>
						</div>
					</li>
				);
			})}
		</ol>
	);
}

interface InstallGuideStepsProps {
	steps: { title: string; description: string }[];
	completedLabel: string;
}
