import { useDidMount } from '@extension/shared/hooks';
import { getSupabaseClient } from '@extension/shared/utils/web';
export default function useSession() {
  const [session, setSession] = useSession();

  useDidMount(async () => {
    const supabaseClient = getSupabaseClient();
    await supabaseClient.auth.getUserIdentities();
  });

  return { session };
}
