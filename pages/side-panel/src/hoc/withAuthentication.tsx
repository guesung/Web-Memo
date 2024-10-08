import { useSupabaseClient, useSupabaseUser } from '@extension/shared/hooks';
import { getSupabaseClient } from '@extension/shared/utils/extension';
import { LoginSection } from '@src/components';

export default function withAuthentication(WrappedComponent: () => JSX.Element) {
  const AuthenticatedComponent = function () {
    const { data: supabaseClient } = useSupabaseClient({ getSupabaseClient });
    const { data: user } = useSupabaseUser({ supabaseClient });

    if (user?.data.user) return <WrappedComponent />;
    return <LoginSection />;
  };

  return AuthenticatedComponent;
}
