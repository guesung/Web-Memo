"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { analytics } from "@web-memo/shared/modules/analytics";
import { cn } from "@web-memo/ui";
import { useReducedMotion } from "framer-motion";
import {
	BookOpen,
	CalendarDays,
	Check,
	ChevronDown,
	ExternalLink,
	Heart,
	Highlighter,
	LockKeyhole,
	Moon,
	Pause,
	Play,
	Settings2,
	Sparkles,
	Star,
} from "lucide-react";
import {
	type FocusEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import SectionHeader from "../SectionHeader";
import SectionShell, { type TSectionBackground } from "../SectionShell";

const STAGES = ["read", "shortcut", "panel", "write", "saved"] as const;
const STAGE_DURATIONS = [2800, 1800, 2800, 3300, 3300] as const;

interface IFInteractiveDemoProps extends LanguageType {
	background?: TSectionBackground;
}

const InteractiveDemo = ({ lng, background }: IFInteractiveDemoProps) => {
	const { t } = useTranslation(lng);
	const reducedMotion = useReducedMotion();
	const [stage, setStage] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const [visible, setVisible] = useState(false);
	const [pageVisible, setPageVisible] = useState(true);
	const sceneRef = useRef<HTMLDivElement>(null);
	const progressRef = useRef<HTMLSpanElement>(null);
	const memoRef = useRef<HTMLSpanElement>(null);
	const elapsedRef = useRef(0);
	const lastFrameRef = useRef<number | null>(null);
	const frameRef = useRef<number | null>(null);
	const stageRef = useRef(stage);
	const memoText = t("introduce.demo.flow.memo_text");
	const autoRunning =
		playing && !reducedMotion && !hovered && !focused && visible && pageVisible;
	let visibleMemoText = memoText;
	if (stage < 3) {
		visibleMemoText = t("introduce.demo.flow.memo_placeholder");
	} else if (stage === 3 && (playing || elapsedRef.current > 0)) {
		const typedCount = Math.round(
			(elapsedRef.current / STAGE_DURATIONS[3]) * memoText.length,
		);
		visibleMemoText = memoText.slice(0, typedCount);
	}

	const chooseStage = (index: number) => {
		stageRef.current = index;
		setStage(index);
		setPlaying(false);
		elapsedRef.current = 0;
		if (progressRef.current) progressRef.current.style.width = "0%";
		void analytics.trackEvent({
			name: "introduce_demo_control",
			params: { action: "select_step", stage: STAGES[index] },
		});
	};

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => setVisible(entry.isIntersecting),
			{
				threshold: 0.1,
			},
		);
		const scene = sceneRef.current;
		if (scene) observer.observe(scene);
		const onVisibilityChange = () => setPageVisible(!document.hidden);
		document.addEventListener("visibilitychange", onVisibilityChange);
		onVisibilityChange();
		return () => {
			observer.disconnect();
			document.removeEventListener("visibilitychange", onVisibilityChange);
		};
	}, []);

	useEffect(() => {
		if (reducedMotion) setPlaying(false);
		else setPlaying(true);
	}, [reducedMotion]);

	const tick = useCallback(
		(timestamp: number) => {
			if (lastFrameRef.current !== null)
				elapsedRef.current += timestamp - lastFrameRef.current;
			lastFrameRef.current = timestamp;
			let currentStage = stageRef.current;
			if (elapsedRef.current >= STAGE_DURATIONS[currentStage]) {
				elapsedRef.current = 0;
				currentStage = (currentStage + 1) % STAGES.length;
				stageRef.current = currentStage;
				setStage(currentStage);
			}
			if (progressRef.current) {
				progressRef.current.style.width = `${(elapsedRef.current / STAGE_DURATIONS[currentStage]) * 100}%`;
			}
			if (currentStage === 3 && memoRef.current) {
				const count = Math.round(
					(elapsedRef.current / STAGE_DURATIONS[3]) * memoText.length,
				);
				memoRef.current.textContent = memoText.slice(0, count);
			}
			frameRef.current = requestAnimationFrame(tick);
		},
		[memoText],
	);

	useEffect(() => {
		if (autoRunning) frameRef.current = requestAnimationFrame(tick);
		else lastFrameRef.current = null;
		return () => {
			if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
			lastFrameRef.current = null;
		};
	}, [autoRunning, tick]);

	const togglePlayback = () => {
		const action = playing ? "pause" : "play";
		setPlaying(!playing);
		void analytics.trackEvent({
			name: "introduce_demo_control",
			params: { action, stage: STAGES[stageRef.current] },
		});
	};

	const onBlur = (event: FocusEvent<HTMLElement>) => {
		if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
	};

	return (
		<SectionShell id="demo" background={background}>
			<SectionHeader title={t("introduce.section.demo")} />
			<section
				aria-label={t("introduce.section.demo")}
				className="overflow-hidden rounded-3xl border border-border bg-card"
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				onFocusCapture={() => setFocused(true)}
				onBlurCapture={onBlur}
			>
				<div
					ref={sceneRef}
					data-testid="demo-scene"
					data-stage={stage}
					aria-hidden="true"
					className="relative h-[430px] overflow-hidden bg-muted sm:h-[520px] lg:h-[575px]"
				>
					<div className="absolute inset-x-2 inset-y-3 overflow-hidden rounded-xl border border-border bg-background shadow-xl sm:inset-x-10 sm:inset-y-8">
						<div className="flex h-11 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
							<div className="hidden gap-1 sm:flex">
								{[0, 1, 2].map((dot) => (
									<span key={dot} className="h-2 w-2 rounded-full bg-border" />
								))}
							</div>
							<span className="text-muted-foreground">‹　›</span>
							<div className="mx-auto flex h-7 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md border border-border bg-muted px-2 text-[11px] text-muted-foreground sm:max-w-[480px]">
								<LockKeyhole className="h-3 w-3 shrink-0" />
								daily.example.com/notes/reading-habit
							</div>
							<span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-foreground text-xs font-bold text-background">
								W
							</span>
						</div>
						<div
							className={cn(
								"h-[calc(100%-44px)] overflow-hidden transition-[padding] duration-700 motion-reduce:transition-none",
								stage >= 2 && "pr-[82%] sm:pr-[41%]",
							)}
						>
							<article
								className={cn(
									"mx-auto mt-8 w-[calc(100%-34px)] max-w-[575px] transition-all duration-700 motion-reduce:transition-none sm:mt-11",
									stage >= 2 &&
										"ml-4 w-[290px] sm:mx-auto sm:w-[calc(100%-38px)]",
								)}
							>
								<p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
									{t("introduce.demo.flow.article_kicker")}
								</p>
								<h3 className="my-3 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
									{t("introduce.demo.flow.article_title")}
								</h3>
								<p className="mb-7 text-[11px] text-muted-foreground">
									{t("introduce.demo.flow.article_meta")}
								</p>
								<p className="mb-4 text-sm leading-7 text-muted-foreground">
									{t("introduce.demo.flow.article_p1")}
								</p>
								<p className="mb-4 text-sm leading-7 text-muted-foreground">
									{t("introduce.demo.flow.article_p2")}
								</p>
								<div className="my-7 border-t border-border" />
								<p className="text-sm leading-7 text-muted-foreground">
									{t("introduce.demo.flow.article_p3")}
								</p>
							</article>
						</div>
						<div
							className={cn(
								"pointer-events-none absolute left-1/2 top-[42%] z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-foreground px-4 py-3 text-xs text-background shadow-xl transition-all duration-300 motion-reduce:transition-none",
								stage === 1 ? "scale-100 opacity-100" : "scale-90 opacity-0",
							)}
						>
							<span>{t("introduce.demo.flow.shortcut_label")}</span>
							<kbd className="rounded border border-background/40 px-2 py-1">
								Alt
							</kbd>
							+
							<kbd className="rounded border border-background/40 px-2 py-1">
								S
							</kbd>
						</div>
						<aside
							className={cn(
								"absolute bottom-0 right-0 top-11 z-10 flex w-[82%] max-w-[350px] flex-col border-l border-border bg-card p-3 shadow-lg transition-transform duration-700 motion-reduce:transition-none sm:w-[41%] sm:p-4",
								stage >= 2 ? "translate-x-0" : "translate-x-full",
							)}
						>
							<div className="flex min-w-0 items-center gap-2 text-xs font-semibold">
								<span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-foreground font-serif text-background">
									d
								</span>
								<span className="min-w-0 flex-1 truncate">
									{t("introduce.demo.flow.article_title")}
								</span>
								<Moon className="h-4 w-4 text-muted-foreground" />
								<Settings2 className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="mt-4 flex h-10 items-center gap-2 border-b border-border text-xs text-muted-foreground">
								<Sparkles className="h-4 w-4" />
								<span className="flex-1">
									{t("introduce.demo.flow.summary")}
								</span>
								<ChevronDown className="h-4 w-4" />
							</div>
							<div className="flex h-10 items-center gap-2 border-b border-border text-xs text-muted-foreground">
								<Highlighter className="h-4 w-4" />
								<span className="flex-1">
									{t("introduce.demo.flow.highlights")}
								</span>
								0<ChevronDown className="h-4 w-4" />
							</div>
							<p className="border-b border-border py-3 text-[11px] text-muted-foreground">
								{t("introduce.demo.flow.empty_highlight")}
							</p>
							<div className="mt-4 flex items-center gap-2 font-bold">
								<span>{t("introduce.demo.flow.memo")}</span>
								<ExternalLink className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="mt-2 truncate border-b border-border py-2 text-xs font-semibold">
								{t("introduce.demo.flow.article_title")}
							</div>
							<div
								className={cn(
									"mt-2 min-h-24 flex-1 rounded-lg border border-border p-3 text-xs leading-5 whitespace-pre-wrap",
									stage === 3 && "ring-1 ring-ring",
								)}
							>
								<span
									ref={memoRef}
									data-testid="demo-memo-text"
									key={`${lng}-${stage}`}
									className={
										stage < 3 ? "text-muted-foreground" : "text-foreground"
									}
								>
									{visibleMemoText}
								</span>
								{stage === 3 && (
									<span className="ml-0.5 inline-block h-4 w-px bg-foreground align-middle motion-safe:animate-pulse" />
								)}
							</div>
							<div className="mt-3 flex items-center gap-2 text-muted-foreground">
								<Heart className="h-4 w-4" />
								<Star className="h-4 w-4" />
								<BookOpen className="h-4 w-4" />
								<CalendarDays className="h-4 w-4" />
								{stage === 4 && (
									<Check data-testid="demo-saved" className="h-4 w-4" />
								)}
								<span className="ml-auto rounded-full border border-dashed border-border px-2 py-1 text-[10px]">
									{t("introduce.demo.flow.category")}
								</span>
							</div>
						</aside>
					</div>
				</div>
				<div className="border-t border-border p-4 sm:p-5">
					<p aria-live="polite" className="text-sm text-muted-foreground">
						{t(`introduce.demo.flow.caption_${STAGES[stage]}`)}
					</p>
					<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
						<fieldset
							aria-label={t("introduce.demo.flow.steps_label")}
							className="flex flex-wrap gap-1"
						>
							{STAGES.map((name, index) => (
								<button
									key={name}
									type="button"
									aria-current={stage === index ? "step" : undefined}
									onClick={() => chooseStage(index)}
									className={cn(
										"relative min-h-9 rounded-full px-3 pb-2.5 pt-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
										stage === index &&
											"bg-secondary font-semibold text-foreground",
									)}
								>
									<span>{t(`introduce.demo.flow.step_${name}`)}</span>
									{stage === index && (
										<span className="absolute inset-x-3 bottom-1 h-0.5 overflow-hidden rounded-full bg-border">
											<span
												ref={progressRef}
												className="block h-full bg-foreground"
											/>
										</span>
									)}
								</button>
							))}
						</fieldset>
						<button
							type="button"
							disabled={Boolean(reducedMotion)}
							aria-label={t(
								`introduce.demo.flow.${playing ? "pause" : "play"}`,
							)}
							onClick={togglePlayback}
							className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border px-3 text-xs text-foreground hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
						>
							{playing ? (
								<Pause className="h-3 w-3" />
							) : (
								<Play className="h-3 w-3" />
							)}
							{t(`introduce.demo.flow.${playing ? "pause" : "play"}`)}
						</button>
					</div>
					{reducedMotion && (
						<p className="mt-3 text-xs text-muted-foreground">
							{t("introduce.demo.flow.reduced")}
						</p>
					)}
				</div>
			</section>
		</SectionShell>
	);
};

export default InteractiveDemo;
