import { LoginSection } from "@src/components";
import { useSupabaseUserQuery } from "@web-memo/shared/hooks";
import type { ReactElement } from "react";

export default function withAuthentication(
	WrappedComponent: () => ReactElement,
) {
	const AuthenticatedComponent = () => {
		const { user } = useSupabaseUserQuery();

		if (user?.data.user) return <WrappedComponent />;
		return <LoginSection />;
	};

	return AuthenticatedComponent;
}
