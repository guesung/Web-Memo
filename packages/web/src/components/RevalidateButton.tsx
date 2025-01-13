'use client';

import { revalidateFullRouteCache } from '@src/utils';

export default function RevalidateButton({ path }: { path: string }) {
  return <button onClick={() => revalidateFullRouteCache(path)}>revalidate</button>;
}
