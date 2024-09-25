import { I18n, LANGUAGE_LIST, OptionStorage, Storage, STORAGE_TYPE_OPTION_LANGUAGE, useFetch } from '@extension/shared';
import { Toast } from '@extension/ui';
import '@src/Options.css';
import { overlay } from 'overlay-kit';
import { FormEvent, useEffect, useRef } from 'react';

export default function OptionForm() {
  const languageRef = useRef<HTMLSelectElement>(null);
  const { data: optionData } = useFetch({ fetchFn: OptionStorage.get, defaultValue: '' });

  const handleResetClick = async () => {
    const response = confirm(I18n.get('modal_modal_question_delete'));
    if (!response) return;

    await chrome.storage.sync.clear();
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!languageRef.current) return;

    Storage.set(STORAGE_TYPE_OPTION_LANGUAGE, languageRef.current?.value);
    overlay.open(({ unmount }) => <Toast message={I18n.get('toast_save_option')} onClose={unmount} />);
  };

  useEffect(() => {
    if (optionData) languageRef.current!.value = optionData;
  }, [optionData]);

  return (
    <form onSubmit={handleFormSubmit}>
      <table className="table">
        <tbody>
          <tr>
            <th>
              <button className="button">{I18n.get('select_language')}</button>
            </th>
            <th>
              <select className="select select-bordered w-full max-w-xs" ref={languageRef}>
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
              <button className="button ">{I18n.get('reset_option')}</button>
            </th>
            <th>
              <button className="btn btn-outline btn-warning" onClick={handleResetClick} type="button">
                {I18n.get('reset')}
              </button>
            </th>
          </tr>
        </tbody>
      </table>
      <div className="my-12 flex justify-end">
        <button className="btn btn-outline btn-accent" type="submit">
          {I18n.get('save')}
        </button>
      </div>
    </form>
  );
}
