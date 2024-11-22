'use server';

import { Label } from '@src/components/ui/label';

export default async function SettingHeader() {
  return <Label className="flex justify-center py-10 text-xl">설정</Label>;
}
