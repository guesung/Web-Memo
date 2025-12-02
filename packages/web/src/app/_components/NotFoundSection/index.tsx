"use client";

import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function NotFoundSection() {
	const { t } = useTranslation();

	return (
		<section className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4">
			<div className="w-full max-w-lg text-center">
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ duration: 0.5 }}
					className="mb-8 text-9xl font-bold text-gray-300"
				>
					404
				</motion.div>

				<motion.div
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.2 }}
					className="space-y-6"
				>
					<h1 className="text-4xl font-bold text-gray-900">
						{t("error.404.title")}
					</h1>

					<p className="text-lg text-gray-600">{t("error.404.description")}</p>

					<div className="relative">
						<motion.div
							animate={{
								x: [-20, 20, -20],
								y: [-10, 10, -10],
							}}
							transition={{
								repeat: Infinity,
								duration: 5,
							}}
							className="mx-auto h-32 w-32"
						>
							<Image
								src="/images/error/lost-astronaut.svg"
								alt="Lost in Space"
								width={128}
								height={128}
								className="h-full w-full"
							/>
						</motion.div>
					</div>

					<Link
						href="/"
						className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
					>
						{t("error.404.backToHome")}
					</Link>
				</motion.div>
			</div>
		</section>
	);
}
