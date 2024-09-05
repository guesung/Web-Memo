import { withSuspense } from '@extension/shared';
import { OverlayProvider } from 'overlay-kit';
import { MemoTable } from './components';

const NewTab = () => {
  return (
    <OverlayProvider>
      <MemoTable />
    </OverlayProvider>
  );
};

export default withSuspense(NewTab, <div> Loading ... </div>);
