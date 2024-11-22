import { PATHS } from '@src/constants';
import { redirect } from 'next/navigation';

export default async function Page() {
  redirect(PATHS.memos);
}
