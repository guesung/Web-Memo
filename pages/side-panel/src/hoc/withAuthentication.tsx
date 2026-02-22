import { LoginSection } from "@src/components";
import { useDidMount, useSupabaseUserQuery } from "@web-memo/shared/hooks";
import { bridge } from "@web-memo/shared/modules/extension-bridge";
import type { ReactElement } from "react";

export default function withAuthentication(
	WrappedComponent: () => ReactElement,
) {
	const AuthenticatedComponent = () => {
		const { user, refetchSupabaseClient, refetch } = useSupabaseUserQuery();

		useDidMount(() => {
			bridge.handle.SYNC_LOGIN_STATUS(async () => {
				await refetchSupabaseClient();
				await refetch();
			});
		});

		if (user?.data.user) return <WrappedComponent />;
		return <LoginSection />;
	};

	return AuthenticatedComponent;
}
