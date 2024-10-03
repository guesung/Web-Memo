'use server';
import LoginSection from './LoginSection';

export default async function page() {
  return (
    <main className="flex items-center justify-center h-full">
      <LoginSection />
    </main>
  );
}
