"use client";

import { motion } from "framer-motion";

export function HeroAnimations() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			<motion.div
				animate={{
					scale: [1, 1.2, 1],
					opacity: [0.2, 0.3, 0.2],
				}}
				transition={{
					duration: 8,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
				className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
			/>
			<motion.div
				animate={{
					scale: [1.2, 1, 1.2],
					opacity: [0.2, 0.3, 0.2],
				}}
				transition={{
					duration: 10,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
				className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"
			/>
			<motion.div
				animate={{
					scale: [1, 1.1, 1],
					x: [0, 50, 0],
				}}
				transition={{
					duration: 12,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
				className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-3xl"
			/>
		</div>
	);
}
