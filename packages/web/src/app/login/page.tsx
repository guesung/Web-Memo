import { createClient } from '@src/utils/supabase-server';
import LoginSection from './LoginSection';

export default async function page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(user);

  // if (user) redirect('/');
  return (
    <main className="bg-base-100 flex flex-col items-center justify-center h-full">
      <LoginSection />
    </main>
  );
}
