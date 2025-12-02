"use client";

import type { LanguageType } from "@src/modules/i18n";
import { motion, useInView } from "framer-motion";
import { Users, FileText, Star, Clock } from "lucide-react";
import { useRef, useEffect, useState } from "react";

interface StatsSectionProps extends LanguageType {
	stats?: {
		userCount: number;
		memoCount: number;
		rating?: number;
	};
}

function AnimatedCounter({
	end,
	duration = 2000,
	suffix = "",
	decimals = 0,
}: {
	end: number;
	duration?: number;
	suffix?: string;
	decimals?: number;
}) {
	const [count, setCount] = useState(0);
	const ref = useRef<HTMLSpanElement>(null);
	const isInView = useInView(ref, { once: true });

	useEffect(() => {
		if (!isInView) return;

		let startTime: number;
		const animate = (currentTime: number) => {
			if (!startTime) startTime = currentTime;
			const progress = Math.min((currentTime - startTime) / duration, 1);
			const easeOutQuart = 1 - Math.pow(1 - progress, 4);
			setCount(easeOutQuart * end);
			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};
		requestAnimationFrame(animate);
	}, [isInView, end, duration]);

	return (
		<span ref={ref}>
			{decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}
			{suffix}
		</span>
	);
}

export default function StatsSection({ lng, stats }: StatsSectionProps) {
	const statItems = [
		{
			icon: Users,
			value: stats?.userCount ?? 250,
			suffix: "+",
			label: lng === "ko" ? "활성 사용자" : "Active Users",
			description: lng === "ko" ? "Chrome 웹스토어 사용자" : "Chrome Web Store users",
			gradient: "from-blue-500 to-cyan-500",
			iconBg: "bg-blue-500/10",
			iconColor: "text-blue-500",
		},
		{
			icon: FileText,
			value: stats?.memoCount ?? 10000,
			suffix: "+",
			label: lng === "ko" ? "저장된 메모" : "Memos Saved",
			description: lng === "ko" ? "사용자들이 저장한 총 메모 개수" : "Total memos saved by users",
			gradient: "from-purple-500 to-pink-500",
			iconBg: "bg-purple-500/10",
			iconColor: "text-purple-500",
		},
		{
			icon: Star,
			value: stats?.rating ?? 5.0,
			suffix: "",
			label: lng === "ko" ? "평균 평점" : "Average Rating",
			description: lng === "ko" ? "Chrome 웹스토어 평점" : "Chrome Web Store rating",
			gradient: "from-yellow-500 to-orange-500",
			iconBg: "bg-yellow-500/10",
			iconColor: "text-yellow-500",
			decimals: 1,
		},
		{
			icon: Clock,
			value: 10,
			suffix: lng === "ko" ? "초" : "s",
			label: lng === "ko" ? "설치 시간" : "Install Time",
			description: lng === "ko" ? "크롬에 설치하는 데 걸리는 시간" : "Time to install on Chrome",
			gradient: "from-green-500 to-emerald-500",
			iconBg: "bg-green-500/10",
			iconColor: "text-green-500",
		},
	];

	return (
		<section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
			<div className="mx-auto max-w-6xl px-4">
				{/* Section Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="text-center mb-16"
				>
					<h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
						{lng === "ko" ? "숫자로 보는 웹 메모" : "Web Memo in Numbers"}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{lng === "ko"
							? "많은 사용자들이 이미 웹 메모와 함께하고 있습니다"
							: "Many users are already using Web Memo"}
					</p>
				</motion.div>

				{/* Stats Grid */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
					{statItems.map((stat, index) => (
						<motion.div
							key={stat.label}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="group relative"
						>
							<div className="relative glass-card rounded-2xl p-6 lg:p-8 text-center transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
								{/* Gradient Border on Hover */}
								<div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

								{/* Icon */}
								<div className={`inline-flex p-4 rounded-xl ${stat.iconBg} mb-4`}>
									<stat.icon className={`h-8 w-8 ${stat.iconColor}`} />
								</div>

								{/* Value */}
								<div className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-2">
									<AnimatedCounter
										end={stat.value}
										suffix={stat.suffix}
										decimals={stat.decimals}
									/>
								</div>

								{/* Label */}
								<div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
									{stat.label}
								</div>

								{/* Description */}
								<div className="text-sm text-gray-500 dark:text-gray-400">
									{stat.description}
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
