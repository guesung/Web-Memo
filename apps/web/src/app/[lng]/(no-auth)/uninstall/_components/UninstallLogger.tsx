"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function UninstallLogger() {
	const searchParams = useSearchParams();
	const uid = searchParams.get("uid");
	const hasLogged = useRef(false);

	useEffect(() => {
		if (hasLogged.current) return;
		hasLogged.current = true;

		const logUninstall = async () => {
			try {
				await fetch("/api/uninstall-log", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId: uid }),
				});
			} catch {
				// Silently fail - logging should not affect user experience
			}
		};
		logUninstall();
	}, [uid]);

	return null;
}
