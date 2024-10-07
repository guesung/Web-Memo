'use server';
import { LoginSection, PersonalInformationInfo } from './components';

export default async function page() {
  return (
    <main className="flex items-center justify-center h-full relative">
      <LoginSection />
      <PersonalInformationInfo />
    </main>
  );
}
