import { OverlayProvider } from 'overlay-kit';
import { MemoTable } from './components';

export default function NewTab() {
  return (
    <OverlayProvider>
      <MemoTable />
    </OverlayProvider>
  );
}
