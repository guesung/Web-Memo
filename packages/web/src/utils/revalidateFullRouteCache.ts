'use server';
import { revalidatePath } from 'next/cache';

export async function revalidateFullRouteCache(path: string) {
  if (path) {
    revalidatePath(path, 'layout');
  }
}
