import { useSupabaseUser } from '@extension/shared/hooks';
import { LoginSection } from '@src/components';

export default function withAuthentication(WrappedComponent: () => JSX.Element) {
  const AuthenticatedComponent = function () {
    const { user } = useSupabaseUser();

    if (user?.data.user) return <WrappedComponent />;
    return <LoginSection />;
  };

  return AuthenticatedComponent;
}
