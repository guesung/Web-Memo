import { getSupabaseClient } from '@extension/shared/utils/web';
import { Introduction } from './components';

export default async function Page() {
  return (
    <main>
      <Introduction />
    </main>
  );
}
