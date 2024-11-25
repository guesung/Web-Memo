import { useSupabaseUser } from '@extension/shared/hooks';
import { useSupabaseClientQuery } from '@extension/shared/hooks/extension';
import { LoginSection } from '@src/components';

export default function withAuthentication(WrappedComponent: () => JSX.Element) {
  const AuthenticatedComponent = function () {
    const { data: supabaseClient } = useSupabaseClientQuery();
    const { data: user } = useSupabaseUser({ supabaseClient });

    if (user?.data.user) return <WrappedComponent />;
    return <LoginSection />;
  };

  return AuthenticatedComponent;
}
