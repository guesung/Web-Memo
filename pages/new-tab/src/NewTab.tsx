import { withErrorBoundary, withSuspense } from '@extension/shared';
import { MemoTable } from './components';

const NewTab = () => {
  return (
    <div className="shadow-xl">
      <MemoTable />
    </div>
  );
};

export default withErrorBoundary(withSuspense(NewTab, <div> Loading ... </div>), <div> Error Occur </div>);
