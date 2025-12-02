"use client";

import type { LanguageType } from "@src/modules/i18n";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

interface TestimonialsProps extends LanguageType {}

export default function Testimonials({ lng }: TestimonialsProps) {
	const testimonials = [
		{
			name: lng === "ko" ? "김**" : "Alex K.",
			role: lng === "ko" ? "대학원생" : "Graduate Student",
			avatar: "MK",
			quote:
				lng === "ko"
					? "논문 자료 정리가 훨씬 편해졌어요. AI 요약 기능이 정말 유용합니다. 긴 논문도 핵심만 빠르게 파악할 수 있어서 연구 시간이 많이 절약됐습니다."
					: "Organizing research materials became much easier. The AI summary feature is really useful. I can quickly grasp the key points of long papers, saving a lot of research time.",
			rating: 5,
			color: "blue",
		},
		{
			name: lng === "ko" ? "이**" : "Sarah L.",
			role: lng === "ko" ? "마케터" : "Marketer",
			avatar: "JL",
			quote:
				lng === "ko"
					? "경쟁사 분석할 때 필수 툴이 됐어요. 여러 아티클을 읽으면서 인사이트를 바로바로 정리할 수 있어서 업무 효율이 크게 올랐습니다."
					: "It's become an essential tool for competitive analysis. I can organize insights while reading multiple articles, which has greatly improved my work efficiency.",
			rating: 5,
			color: "purple",
		},
		{
			name: lng === "ko" ? "박**" : "James P.",
			role: lng === "ko" ? "개발자" : "Developer",
			avatar: "JP",
			quote:
				lng === "ko"
					? "기술 블로그나 문서를 읽을 때 항상 사용해요. 나중에 다시 찾아볼 때 메모해둔 내용이 정말 도움이 됩니다. 강력 추천합니다!"
					: "I always use it when reading tech blogs or documentation. The notes I take are really helpful when I need to refer back. Highly recommend!",
			rating: 5,
			color: "green",
		},
	];

	const getAvatarColor = (color: string) => {
		const colors: Record<string, string> = {
			blue: "bg-gradient-to-br from-blue-500 to-cyan-500",
			purple: "bg-gradient-to-br from-purple-500 to-pink-500",
			green: "bg-gradient-to-br from-green-500 to-emerald-500",
		};
		return colors[color];
	};

	return (
		<section className="py-20 bg-white dark:bg-gray-900">
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
						{lng === "ko" ? "사용자 후기" : "What Users Say"}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{lng === "ko"
							? "실제 사용자들의 경험을 확인해보세요"
							: "See what real users have to say"}
					</p>
				</motion.div>

				{/* Testimonials Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{testimonials.map((testimonial, index) => (
						<motion.div
							key={testimonial.name}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="group"
						>
							<div className="relative h-full glass-card rounded-2xl p-8 transition-all duration-300 hover:shadow-xl">
								{/* Quote Icon */}
								<div className="absolute top-6 right-6 text-gray-200 dark:text-gray-700">
									<Quote className="h-10 w-10" />
								</div>

								{/* Rating */}
								<div className="flex gap-1 mb-4">
									{[...Array(testimonial.rating)].map((_, i) => (
										<Star
											key={i}
											className="h-5 w-5 fill-yellow-400 text-yellow-400"
										/>
									))}
								</div>

								{/* Quote */}
								<p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
									"{testimonial.quote}"
								</p>

								{/* Author */}
								<div className="flex items-center gap-4">
									<div
										className={`w-12 h-12 rounded-full ${getAvatarColor(testimonial.color)} flex items-center justify-center text-white font-semibold`}
									>
										{testimonial.avatar}
									</div>
									<div>
										<div className="font-semibold text-gray-900 dark:text-gray-100">
											{testimonial.name}
										</div>
										<div className="text-sm text-gray-500 dark:text-gray-400">
											{testimonial.role}
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					))}
				</div>

				{/* Note about placeholder */}
				<motion.p
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5, delay: 0.5 }}
					className="text-center mt-8 text-sm text-gray-400 dark:text-gray-500"
				>
					{lng === "ko"
						? "* 대표적인 사용 사례를 바탕으로 작성되었습니다"
						: "* Based on representative use cases"}
				</motion.p>
			</div>
		</section>
	);
}
