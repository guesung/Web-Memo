import { withErrorBoundary, withSuspense } from '@extension/shared';
import '@src/Options.css';

const Options = () => {
  const handleResetClick = async () => {
    await chrome.storage.sync.clear();
  };
  return (
    <div>
      <button className="button" onClick={handleResetClick}>
        초기화
      </button>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
