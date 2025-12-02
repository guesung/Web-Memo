"use client";

import type { LanguageType } from "@src/modules/i18n";
import { motion } from "framer-motion";
import { GraduationCap, Briefcase, Target, Lightbulb } from "lucide-react";

interface UseCasesProps extends LanguageType {}

export default function UseCases({ lng }: UseCasesProps) {
	const useCases = [
		{
			icon: GraduationCap,
			emoji: "📚",
			title: lng === "ko" ? "학생 & 연구자" : "Students & Researchers",
			description:
				lng === "ko"
					? "온라인 강의나 자료 조사할 때 핵심 내용만 골라 저장하세요. 논문 작성에 필요한 레퍼런스를 체계적으로 관리할 수 있습니다."
					: "Save key content while taking online courses or researching. Manage references systematically for your papers.",
			color: "blue",
			gradient: "from-blue-500 to-indigo-500",
		},
		{
			icon: Briefcase,
			emoji: "💼",
			title: lng === "ko" ? "직장인" : "Professionals",
			description:
				lng === "ko"
					? "경쟁사 분석이나 트렌드 모니터링을 체계적으로 관리하세요. 업무에 필요한 정보를 빠르게 찾을 수 있습니다."
					: "Manage competitive analysis and trend monitoring systematically. Find work-related information quickly.",
			color: "purple",
			gradient: "from-purple-500 to-pink-500",
		},
		{
			icon: Target,
			emoji: "🎯",
			title: lng === "ko" ? "효율적인 분들" : "Efficiency Seekers",
			description:
				lng === "ko"
					? "긴 글 대신 AI 요약으로 핵심만 빠르게 파악하세요. 시간을 절약하며 더 많은 콘텐츠를 소화할 수 있습니다."
					: "Get the key points quickly with AI summaries instead of long articles. Save time and consume more content.",
			color: "green",
			gradient: "from-green-500 to-emerald-500",
		},
		{
			icon: Lightbulb,
			emoji: "💡",
			title: lng === "ko" ? "콘텐츠 크리에이터" : "Content Creators",
			description:
				lng === "ko"
					? "영감을 주는 콘텐츠와 아이디어를 모아두세요. 창작 활동에 필요한 레퍼런스를 한 곳에서 관리할 수 있습니다."
					: "Collect inspiring content and ideas. Manage all your creative references in one place.",
			color: "amber",
			gradient: "from-amber-500 to-orange-500",
		},
	];

	return (
		<section className="py-20 bg-gray-50 dark:bg-gray-900/50">
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
						{lng === "ko" ? "이런 분들에게 추천해요" : "Perfect For"}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{lng === "ko"
							? "다양한 상황에서 웹 메모가 도움이 됩니다"
							: "Web Memo helps in various situations"}
					</p>
				</motion.div>

				{/* Use Cases Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{useCases.map((useCase, index) => (
						<motion.div
							key={useCase.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="group"
						>
							<div className="relative h-full glass-card rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden">
								{/* Gradient Background on Hover */}
								<div
									className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
								/>

								<div className="relative z-10 flex gap-6">
									{/* Emoji/Icon */}
									<div className="flex-shrink-0">
										<span className="text-5xl">{useCase.emoji}</span>
									</div>

									{/* Content */}
									<div>
										<h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
											{useCase.title}
										</h3>
										<p className="text-gray-600 dark:text-gray-400 leading-relaxed">
											{useCase.description}
										</p>
									</div>
								</div>

								{/* Decorative Corner Gradient */}
								<div
									className={`absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br ${useCase.gradient} opacity-10 rounded-full blur-3xl`}
								/>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
