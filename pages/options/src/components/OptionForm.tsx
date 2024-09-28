import { LANGUAGE_LIST } from '@extension/shared/constants';
import { useFetch } from '@extension/shared/hooks';
import { convertToCSVBlob, convertToJSONBlob, downloadBlob } from '@extension/shared/utils';
import {
  getMemoList,
  I18n,
  OptionStorage,
  Storage,
  STORAGE_TYPE_OPTION_LANGUAGE,
} from '@extension/shared/utils/extension';
import { Toast } from '@extension/ui';
import '@src/Options.css';
import { overlay } from 'overlay-kit';
import { FormEvent, useEffect, useRef } from 'react';

export default function OptionForm() {
  const languageRef = useRef<HTMLSelectElement>(null);
  const { data: optionData } = useFetch({ fetchFn: OptionStorage.get, defaultValue: '' });
  const { data: memoList } = useFetch({ fetchFn: getMemoList, defaultValue: [] });

  const handleCSVDownloadClick = () => {
    if (!memoList) return;
    const csvBlob = convertToCSVBlob(memoList);
    downloadBlob(csvBlob, { fileExtension: 'csv' });
  };

  const handleJSONDownloadClick = () => {
    if (!memoList) return;
    const jsonBlob = convertToJSONBlob(memoList);
    downloadBlob(jsonBlob, { fileExtension: 'json' });
  };

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
            <th>{I18n.get('select_language')}</th>
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
            <th></th>
            <th>
              <button className="btn btn-outline" onClick={handleCSVDownloadClick} type="button">
                {I18n.get('download_csv_option')}
              </button>
            </th>
          </tr>
          <tr>
            <th></th>
            <th>
              <button className="btn btn-outline" onClick={handleJSONDownloadClick} type="button">
                {I18n.get('download_json_option')}
              </button>
            </th>
          </tr>
          <tr>
            <th></th>
            <th>
              <button className="btn btn-outline" onClick={handleResetClick} type="button">
                {I18n.get('reset_option')}
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
