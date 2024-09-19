import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import useDidMount from '../useDidMount';
import { getSession } from '../../utils/extension';

export default function useSession() {
  const [session, setSession] = useState<Session | undefined>();

  useDidMount(async () => {
    const session = await getSession();
    setSession(session);
  });

  return { session };
}
