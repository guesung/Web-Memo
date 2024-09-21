import { MemoTable } from '@extension/ui';
import { OverlayProvider } from 'overlay-kit';

export default function NewTab() {
  return (
    <OverlayProvider>
      <MemoTable />
    </OverlayProvider>
  );
}
