'use client';

import { signInOAuth } from '@src/utils';

export default function page() {
  const handleLogin = async () => {
    signInOAuth('google');
  };

  return (
    <button className="btn" onClick={handleLogin}>
      구글 로그인
    </button>
  );
}
