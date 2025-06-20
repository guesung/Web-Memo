"use client";
import { UPDATE_LIST } from "@src/constants/Update";
import type { LanguageType } from "@src/modules/i18n";
import useTranslation from "@src/modules/i18n/util.client";
import { motion } from "framer-motion";

const container = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.1,
		},
	},
};

const item = {
	hidden: { opacity: 0, y: 20 },
	show: { opacity: 1, y: 0 },
};

interface UpdateListProps extends LanguageType {}

export default function UpdateList({ lng }: UpdateListProps) {
	const { t } = useTranslation(lng);

	return (
		<motion.div
			variants={container}
			initial="hidden"
			animate="show"
			className="mx-auto max-w-4xl space-y-12"
		>
			{UPDATE_LIST.map(({ version, date }) => (
				<motion.div
					key={version}
					variants={item}
					className="border-border border-b pb-8"
				>
					<div className="mb-4 flex items-baseline gap-4">
						<h2 className="text-2xl font-semibold">{version}</h2>
						<span className="text-muted-foreground">{date}</span>
					</div>
					<h3 className="mb-4 text-xl">
						{t(`updates.versions.${version}.title`)}
					</h3>
					<ul className="list-inside list-disc space-y-2">
						{(
							t(`updates.versions.${version}.content`, {
								returnObjects: true,
							}) as string[]
						).map((item: string, index: number) => (
							<motion.li
								key={index}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: index * 0.1 }}
								className="text-muted-foreground"
							>
								{item}
							</motion.li>
						))}
					</ul>
				</motion.div>
			))}
		</motion.div>
	);
}
