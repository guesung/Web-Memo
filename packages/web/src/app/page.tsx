import { Introduction } from './components';
import { redirect } from 'next/navigation';

export default async function Page() {
  redirect('/memos');
}
