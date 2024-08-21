import { withErrorBoundary, withSuspense } from '@extension/shared';

const Popup = () => {
  return <header></header>;
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), <div> Error Occur </div>);
