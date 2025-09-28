import { LoginSection } from "@src/components";
import { useDidMount, useSupabaseUserQuery } from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";

export default function withAuthentication(
	WrappedComponent: () => JSX.Element,
) {
	const AuthenticatedComponent = () => {
		const { user, refetchSupabaseClient, refetch } = useSupabaseUserQuery();

		useDidMount(() => {
			ExtensionBridge.responseSyncLoginStatus(async () => {
				console.log(0);
				await refetchSupabaseClient();
				await refetch();
				console.log(user);
			});
		});

		if (user?.data.user) return <WrappedComponent />;
		return <LoginSection />;
	};

	return AuthenticatedComponent;
}
