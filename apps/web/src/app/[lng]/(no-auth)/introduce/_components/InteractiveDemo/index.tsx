"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { CONFIG } from "@web-memo/env";
import { cn } from "@web-memo/ui";
import { useReducedMotion } from "framer-motion";
import {
	BarChart3,
	FolderOpen,
	Globe,
	Heart,
	Pencil,
	Sparkles,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import SectionHeader from "../SectionHeader";
import SectionShell, { type TSectionBackground } from "../SectionShell";

/**
 * 스크린샷 탭 데모.
 * @description
 * 5초마다 탭이 자동으로 넘어간다. **이 회전은 `prefers-reduced-motion`을 따른다** —
 * 사용자가 동작 축소를 켰으면 자동 전환도 교차 페이드도 멈추고, 탭은 눌렀을 때만
 * 바뀐다. 자동 회전은 사용자가 멈출 수 없는 움직임이라 그 설정의 정확한 대상이다.
 */

/** 자동 회전 주기 */
const AUTO_ROTATE_INTERVAL_MS = 5000;

/** 탭을 직접 눌렀을 때 자동 회전을 멈춰 두는 시간 */
const MANUAL_PAUSE_MS = 3000;

const DEMO_TABS = [
	{ id: "memo", icon: Pencil, imageIndex: 1 },
	{ id: "overview", icon: BarChart3, imageIndex: 2 },
	{ id: "ai", icon: Sparkles, imageIndex: 3 },
	{ id: "wishlist", icon: Heart, imageIndex: 4 },
	{ id: "organize", icon: FolderOpen, imageIndex: 5 },
];

interface InteractiveDemoProps extends LanguageType {
	background?: TSectionBackground;
}

export default function InteractiveDemo({
	lng,
	background,
}: InteractiveDemoProps) {
	const { t } = useTranslation(lng);
	const [activeTabIndex, setActiveTabIndex] = useState(0);
	const [progress, setProgress] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const prefersReducedMotion = useReducedMotion();

	const rafRef = useRef<number | null>(null);
	const lastTimeRef = useRef<number | null>(null);

	const isAutoRotating = !prefersReducedMotion && !isPaused;

	useEffect(() => {
		if (!isAutoRotating) {
			lastTimeRef.current = null;
			setProgress(0);
			return;
		}

		const step = (timestamp: number) => {
			if (lastTimeRef.current === null) {
				lastTimeRef.current = timestamp;
			}

			const elapsed = timestamp - lastTimeRef.current;
			lastTimeRef.current = timestamp;

			setProgress((previous) => {
				const next = previous + (elapsed / AUTO_ROTATE_INTERVAL_MS) * 100;

				if (next < 100) {
					return next;
				}

				setActiveTabIndex(
					(previousIndex) => (previousIndex + 1) % DEMO_TABS.length,
				);
				return 0;
			});

			rafRef.current = requestAnimationFrame(step);
		};

		rafRef.current = requestAnimationFrame(step);

		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [isAutoRotating]);

	const handleTabClick = (index: number) => {
		setActiveTabIndex(index);
		setProgress(0);
		setIsPaused(true);
		setTimeout(() => setIsPaused(false), MANUAL_PAUSE_MS);
	};

	const activeTab = DEMO_TABS[activeTabIndex];

	return (
		<SectionShell id="demo" background={background}>
			<SectionHeader
				title={t("introduce.section.demo")}
				description={t("introduce.section.demo_desc")}
			/>

			{/* 자동 회전은 포인터가 올라와 있는 동안 멈춘다. 읽는 중에 화면이 바뀌면
			    안 되므로 carousel 영역으로 이름을 붙여 둔다 */}
			<section
				aria-roledescription="carousel"
				aria-label={t("introduce.section.demo")}
				className="overflow-hidden rounded-3xl border border-border bg-card"
				onMouseEnter={() => setIsPaused(true)}
				onMouseLeave={() => setIsPaused(false)}
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
					{DEMO_TABS.map((tab, index) => {
						const isActive = activeTabIndex === index;

						// 비활성 슬라이드는 페이드 시간만큼 늦게 사라져, 새 슬라이드가 덮이는 동안 배경이 비치지 않는다
						return (
							<div
								key={tab.id}
								aria-hidden={!isActive}
								className={cn(
									"absolute inset-0",
									isActive ? "z-10 opacity-100" : "opacity-0",
									!prefersReducedMotion &&
										(isActive
											? "transition-opacity duration-300"
											: "transition-opacity duration-0 delay-300"),
								)}
							>
								<Image
									src={`/images/pngs/introduction/${lng}/${tab.imageIndex}.png`}
									alt={t(`introduce.demo.tab_${tab.id}`)}
									fill
									priority={index === 0}
									loading="eager"
									className="object-contain"
								/>
							</div>
						);
					})}
				</div>

				<div className="border-t border-border p-4">
					<div className="flex flex-wrap justify-center gap-1">
						{DEMO_TABS.map((tab, index) => {
							const isActive = activeTabIndex === index;

							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => handleTabClick(index)}
									className={cn(
										"relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-colors duration-base",
										isActive
											? "bg-secondary text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<tab.icon className="h-4 w-4" />
									<span className="hidden sm:inline">
										{t(`introduce.demo.tab_${tab.id}`)}
									</span>

									{isActive && isAutoRotating ? (
										<span className="absolute inset-x-3 bottom-1 h-px overflow-hidden rounded-full bg-border">
											<span
												className="block h-full bg-foreground"
												style={{ width: `${progress}%` }}
											/>
										</span>
									) : null}
								</button>
							);
						})}
					</div>

					<p className="mt-4 text-center text-sm text-muted-foreground">
						{t(`introduce.demo.tab_${activeTab.id}_desc`)}
					</p>
				</div>
			</section>
		</SectionShell>
	);
}
