'use client';

import LoginSection from './LoginSection';

export default function page() {
  return (
    <main className="bg-base-100 flex flex-col items-center">
      <div>소셜 로그인</div>
      <LoginSection />
    </main>
  );
}
