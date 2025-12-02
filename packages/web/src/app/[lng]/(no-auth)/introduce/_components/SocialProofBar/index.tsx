"use client";

import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion, useInView } from "framer-motion";
import { Star, Users, Gift, Shield } from "lucide-react";
import { useRef, useEffect, useState } from "react";

interface SocialProofBarProps extends LanguageType {}

function AnimatedCounter({ end, duration = 2000 }: { end: number; duration?: number }) {
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
			setCount(Math.floor(easeOutQuart * end));
			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};
		requestAnimationFrame(animate);
	}, [isInView, end, duration]);

	return <span ref={ref}>{count}</span>;
}

export default function SocialProofBar({ lng }: SocialProofBarProps) {
	const { t } = useTranslation(lng);

	const proofItems = [
		{
			icon: Users,
			value: 250,
			suffix: "+",
			label: t("introduce.social_proof.active_users"),
			color: "text-blue-600 dark:text-blue-400",
			bgColor: "bg-blue-100 dark:bg-blue-900/30",
		},
		{
			icon: Star,
			value: 5.0,
			suffix: "",
			label: t("introduce.social_proof.rating"),
			color: "text-yellow-600 dark:text-yellow-400",
			bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
			isDecimal: true,
		},
		{
			icon: Gift,
			value: 100,
			suffix: "%",
			label: t("introduce.social_proof.free_forever"),
			color: "text-green-600 dark:text-green-400",
			bgColor: "bg-green-100 dark:bg-green-900/30",
		},
		{
			icon: Shield,
			value: 0,
			suffix: "",
			label: t("introduce.social_proof.no_tracking"),
			color: "text-purple-600 dark:text-purple-400",
			bgColor: "bg-purple-100 dark:bg-purple-900/30",
			customValue: t("introduce.social_proof.safe"),
		},
	];

	return (
		<section className="py-8 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-y border-gray-100 dark:border-gray-800">
			<div className="mx-auto max-w-6xl px-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
				>
					{proofItems.map((item, index) => (
						<motion.div
							key={item.label}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							className="flex items-center gap-4"
						>
							<div className={`p-3 rounded-xl ${item.bgColor}`}>
								<item.icon className={`h-6 w-6 ${item.color}`} />
							</div>
							<div>
								<div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
									{item.customValue ? (
										item.customValue
									) : item.isDecimal ? (
										"5.0"
									) : (
										<>
											<AnimatedCounter end={item.value} />
											{item.suffix}
										</>
									)}
								</div>
								<div className="text-sm text-gray-600 dark:text-gray-400">
									{item.label}
								</div>
							</div>
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
