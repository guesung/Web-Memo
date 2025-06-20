import { useSupabaseUserQuery } from "@extension/shared/hooks";
import { LoginSection } from "@src/components";

export default function withAuthentication(
	WrappedComponent: () => JSX.Element,
) {
	const AuthenticatedComponent = function () {
		const { user } = useSupabaseUserQuery();

		if (user?.data.user) return <WrappedComponent />;
		return <LoginSection />;
	};

	return AuthenticatedComponent;
}
