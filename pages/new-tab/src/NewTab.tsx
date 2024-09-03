import { withErrorBoundary, withSuspense } from '@extension/shared';
import { MemoTable } from './components';
import { OverlayProvider } from 'overlay-kit';

const NewTab = () => {
  return (
    <OverlayProvider>
      <MemoTable />
    </OverlayProvider>
  );
};

export default withErrorBoundary(withSuspense(NewTab, <div> Loading ... </div>), <div> Error Occur </div>);
