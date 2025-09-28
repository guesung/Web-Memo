import { LoginSection } from "@src/components";
import { SUPABASE } from "@web-memo/shared/constants";
import { useDidMount, useSupabaseUserQuery } from "@web-memo/shared/hooks";
import { ExtensionBridge } from "@web-memo/shared/modules/extension-bridge";
import { toast } from "@web-memo/ui";

export default function withAuthentication(
	WrappedComponent: () => JSX.Element,
) {
	const AuthenticatedComponent = () => {
		const { user, refetch } = useSupabaseUserQuery();

		useDidMount(() => {
			ExtensionBridge.responseSignout(async () => {
				toast({
					title: "웹에서 로그아웃 되었습니다.",
					description: " 확장 프로그램에서도 로그아웃 됩니다.",
				});

				refetch();
				chrome.storage.sync.remove(SUPABASE.authToken);
			});
		});

		if (user?.data.user) return <WrappedComponent />;
		return <LoginSection />;
	};

	return AuthenticatedComponent;
}
