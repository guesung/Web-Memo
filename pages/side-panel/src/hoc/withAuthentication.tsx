/* eslint-disable react-hooks/rules-of-hooks */
import { useFetch } from '@extension/shared/hooks';
import { getSession } from '@extension/shared/utils/extension';

export default function withAuthentication(WrappedComponent: () => JSX.Element) {
  const AuthenticatedComponent = function () {
    const { data: session } = useFetch({
      fetchFn: getSession,
    });

    if (session) return <WrappedComponent />;
    else return <div>로그인 필요</div>;
  };

  return AuthenticatedComponent;
}
