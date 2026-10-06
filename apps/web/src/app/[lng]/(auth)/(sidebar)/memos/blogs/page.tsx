"use server";

import type { LanguageParams } from "@src/modules/i18n";
import { SidebarTrigger } from "@web-memo/ui";

import { ClientBlogReadingView } from "./_components";

export default async function Page({ params }: LanguageParams) {
	const { lng } = await params;

	return (
		<div className="min-h-[calc(100vh-4rem)]">
			<div className="md:hidden fixed top-20 left-4 z-40">
				<SidebarTrigger className="shadow-lg shadow-primary/10 hover:shadow-primary/20 bg-card border border-border hover:border-primary/50 transition-all duration-200 hover:scale-110 active:scale-95" />
			</div>

			<div className="px-4 pb-4 pt-16 md:px-6 md:pt-4">
				<ClientBlogReadingView lng={lng} />
			</div>
		</div>
	);
}
