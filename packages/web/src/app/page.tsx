'use client';
import { Footer, Header, Introduce } from '@src/components';
import { createClient } from '@supabase/supabase-js';
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Page() {
  return (
    <main>
      <Header />
      <Introduce />
      <Footer />
    </main>
  );
}
