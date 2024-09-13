import { testSentry, useDidMount, withSuspense } from '@extension/shared';
import { OverlayProvider } from 'overlay-kit';
import { MemoTable } from './components';

const NewTab = () => {
  useDidMount(testSentry);
  return (
    <OverlayProvider>
      <MemoTable />
    </OverlayProvider>
  );
};

export default withSuspense(NewTab, <div> Loading ... </div>);
