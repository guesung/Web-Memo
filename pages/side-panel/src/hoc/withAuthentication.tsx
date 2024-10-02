/* eslint-disable react-hooks/rules-of-hooks */
import { useFetch } from '@extension/shared/hooks';
import { getSession } from '@extension/shared/utils/extension';
import { LoginSection } from '@src/components';

export default function withAuthentication(WrappedComponent: () => JSX.Element) {
  const AuthenticatedComponent = function () {
    const { data: session } = useFetch({
      fetchFn: getSession,
    });

    if (session) return <WrappedComponent />;
    else return <LoginSection />;
  };

  return AuthenticatedComponent;
}
