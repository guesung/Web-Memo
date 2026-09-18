"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { CONFIG } from "@web-memo/env";
import { cn } from "@web-memo/ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Globe } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import SectionHeader from "../SectionHeader";
import SectionShell, { type TSectionBackground } from "../SectionShell";

/**
 * 대표 사용 흐름 데모.
 * @description
 * 장면 전환은 **버튼을 눌렀을 때만** 일어난다. 자동 회전을 없앤 이유는 사용자가
 * 멈출 수 없는 움직임을 만들지 않기 위해서다 — `prefers-reduced-motion`으로
 * 우회하는 대신 애초에 그 문제를 만들지 않는다.
 */

const SCENES = [
	{ id: "memo", imageIndex: 1 },
	{ id: "overview", imageIndex: 2 },
];

interface InteractiveDemoProps extends LanguageType {
	background?: TSectionBackground;
}

export default function InteractiveDemo({
	lng,
	background,
}: InteractiveDemoProps) {
	const { t } = useTranslation(lng);
	const [activeSceneIndex, setActiveSceneIndex] = useState(0);
	const prefersReducedMotion = useReducedMotion();

	const activeScene = SCENES[activeSceneIndex];

	return (
		<SectionShell background={background}>
			<SectionHeader
				title={t("introduce.section.demo")}
				description={t("introduce.section.demo_desc")}
			/>

			{/* #demo 앵커는 이 카드에 둔다 — SectionHeader까지 포함해 섹션 최상단에
			    두면 헤더 텍스트만큼 스크롤이 덜 내려가 장면 선택 버튼이 화면 밖으로
			    밀린다. */}
			<div
				id="demo"
				className="scroll-mt-8 overflow-hidden rounded-3xl border border-border bg-card"
			>
				{/* 브라우저 주소 표시줄 */}
				<div className="flex items-center gap-3 border-b border-border px-5 py-3">
					<div className="flex gap-1.5">
						<span className="h-2.5 w-2.5 rounded-full bg-border" />
						<span className="h-2.5 w-2.5 rounded-full bg-border" />
						<span className="h-2.5 w-2.5 rounded-full bg-border" />
					</div>
					<div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
						<Globe className="h-3.5 w-3.5 flex-shrink-0" />
						<span className="truncate">{CONFIG.webDisplayHost}</span>
					</div>
				</div>

				<div className="relative aspect-[16/9] bg-muted">
					<AnimatePresence mode="wait">
						<motion.div
							key={activeScene.id}
							initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
							transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
							className="absolute inset-0"
						>
							<Image
								src={`/images/pngs/introduction/${lng}/${activeScene.imageIndex}.png`}
								alt={t(`introduce.demo.tab_${activeScene.id}_alt`)}
								fill
								className="object-contain"
							/>
						</motion.div>
					</AnimatePresence>
				</div>

				<div className="border-t border-border p-4">
					<div className="flex flex-wrap justify-center gap-3">
						{SCENES.map((scene, index) => {
							const isActive = activeSceneIndex === index;

							return (
								<button
									key={scene.id}
									type="button"
									aria-pressed={isActive}
									onClick={() => setActiveSceneIndex(index)}
									className={cn(
										"flex min-h-12 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm transition-colors duration-base",
										isActive
											? "bg-secondary text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<span
										className={cn(
											"flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium",
											isActive
												? "bg-foreground text-background"
												: "border border-border",
										)}
									>
										{index + 1}
									</span>
									{t(`introduce.demo.tab_${scene.id}`)}
								</button>
							);
						})}
					</div>

					<p className="mt-4 text-center text-sm text-muted-foreground">
						{t(`introduce.demo.tab_${activeScene.id}_desc`)}
					</p>
				</div>
			</div>
		</SectionShell>
	);
}
