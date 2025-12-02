"use server";

import { HeaderMargin } from "@src/components/Header";
import type { LanguageParams } from "@src/modules/i18n";
import { getSupabaseClient } from "@src/modules/supabase/util.server";
import { PATHS } from "@web-memo/shared/constants";
import { AdminService } from "@web-memo/shared/utils";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

import { AdminSidebar } from "./_components";

export const metadata: Metadata = {
	robots: {
		index: false,
		follow: false,
	},
};

interface LayoutProps extends LanguageParams, PropsWithChildren {}

export default async function AdminLayout({
	children,
	params: { lng },
}: LayoutProps) {
	const supabaseClient = getSupabaseClient();
	const {
		data: { user },
	} = await supabaseClient.auth.getUser();

	if (!user) {
		redirect(`/${lng}${PATHS.login}`);
	}

	const isAdmin = await new AdminService(supabaseClient).checkIsAdmin(user.id);
	if (!isAdmin) {
		redirect(`/${lng}${PATHS.memos}`);
	}

	return (
		<div className="flex min-h-screen bg-background">
			<AdminSidebar lng={lng} />
			<main className="flex-1">
				<HeaderMargin />
				<div className="container mx-auto px-6 py-8">{children}</div>
			</main>
		</div>
	);
}
