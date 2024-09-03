import { withErrorBoundary, withSuspense } from '@extension/shared';
import '@src/Options.css';

const Options = () => {
  const handleResetClick = async () => {
    await chrome.storage.sync.clear();
  };
  return (
    <main className="max-w-[1000px] mx-auto text-start text-base">
      <header className="my-4">
        <h1 className="text-2xl">Setting</h1>
      </header>
      <section>
        <table className="table">
          <tbody>
            <tr>
              <th>
                <button className="button" onClick={handleResetClick}>
                  언어 선택
                </button>
              </th>
              <th>
                <select className="select select-bordered w-full max-w-xs">
                  <option>한국어</option>
                  <option>English</option>
                </select>
              </th>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
