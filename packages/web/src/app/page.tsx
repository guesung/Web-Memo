'use client';
import { getSupabaseClient } from '@extension/shared/utils/web';
import { Introduce } from '@src/components';

export default async function Page() {
  const supabaseClient = getSupabaseClient();
  return (
    <main>
      <Introduce />
    </main>
  );
}
