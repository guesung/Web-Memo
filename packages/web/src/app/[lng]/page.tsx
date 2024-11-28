import { PATHS } from '@extension/shared/constants';
import { redirect } from 'next/navigation';

export default async function Page() {
  redirect(PATHS.memos);
}
