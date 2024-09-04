import { LANGUAGE_LIST, Storage, useFetch, withErrorBoundary, withSuspense } from '@extension/shared';
import '@src/Options.css';
import { FormEvent } from 'react';

const Options = () => {
  const handleResetClick = async () => {
    const response = confirm('데이터를 정말로 초기화 하시겠습니까?');
    if (!response) return;

    await chrome.storage.sync.clear();
  };

  const { data } = useFetch({ fetchFn: Storage.get });

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <form className="max-w-[1000px] mx-auto text-start text-base px-8" onSubmit={handleFormSubmit}>
      <header className="my-4">
        <h1 className="text-2xl">Setting</h1>
      </header>
      <section>
        <table className="table">
          <tbody>
            <tr>
              <th>
                <button className="button">언어 선택</button>
              </th>
              <th>
                <select className="select select-bordered w-full max-w-xs">
                  {LANGUAGE_LIST.map(({ inEnglish, inNative }) => (
                    <option value={inEnglish} key={inEnglish}>
                      {inNative}
                    </option>
                  ))}
                </select>
              </th>
            </tr>
            <tr>
              <th>
                <button className="button ">데이터 초기화</button>
              </th>
              <th>
                <button className="btn btn-outline btn-warning" onClick={handleResetClick} type="button">
                  초기화
                </button>
              </th>
            </tr>
          </tbody>
        </table>
        <div className="my-12 flex justify-end">
          <button className="btn btn-outline btn-accent" type="submit">
            저장
          </button>
        </div>
      </section>
    </form>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
