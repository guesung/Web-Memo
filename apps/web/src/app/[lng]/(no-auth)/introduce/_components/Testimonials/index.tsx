"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

export interface TestimonialsProps extends LanguageType {}

export default function Testimonials({ lng }: TestimonialsProps) {
	const { t } = useTranslation(lng);

	const testimonials = [
		{
			name: t("introduce.testimonial.kim_name"),
			role: t("introduce.testimonial.kim_role"),
			avatar: "MK",
			quote: t("introduce.testimonial.kim_quote"),
			rating: 5,
			color: "blue",
		},
		{
			name: t("introduce.testimonial.lee_name"),
			role: t("introduce.testimonial.lee_role"),
			avatar: "JL",
			quote: t("introduce.testimonial.lee_quote"),
			rating: 5,
			color: "purple",
		},
		{
			name: t("introduce.testimonial.park_name"),
			role: t("introduce.testimonial.park_role"),
			avatar: "JP",
			quote: t("introduce.testimonial.park_quote"),
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
						{t("introduce.section.testimonials_title")}
					</h2>
					<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
						{t("introduce.section.testimonials_desc")}
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
					{t("introduce.section.testimonials_note")}
				</motion.p>
			</div>
		</section>
	);
}
