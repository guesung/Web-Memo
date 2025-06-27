import { LoginSection } from "@src/components";
import { useSupabaseUserQuery } from "@web-memo/shared/hooks";

export default function withAuthentication(
	WrappedComponent: () => JSX.Element,
) {
	const AuthenticatedComponent = () => {
		const { user } = useSupabaseUserQuery();

		if (user?.data.user) return <WrappedComponent />;
		return <LoginSection />;
	};

	return AuthenticatedComponent;
}
