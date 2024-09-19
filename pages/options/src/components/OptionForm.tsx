import {
  getSession,
  I18n,
  insertMemo,
  LANGUAGE_LIST,
  MemoStorage,
  OptionStorage,
  removeSession,
  Storage,
  STORAGE_TYPE_OPTION_LANGUAGE,
  useFetch,
  WEB_URL,
} from '@extension/shared';
import { Toast } from '@extension/ui';
import '@src/Options.css';
import { overlay } from 'overlay-kit';
import { FormEvent, useEffect, useRef } from 'react';

export default function OptionForm() {
  const languageRef = useRef<HTMLSelectElement>(null);
  const { data } = useFetch({ fetchFn: OptionStorage.get, defaultValue: '' });
  const { data: sessionData, refetch: refetchSessionData } = useFetch({
    fetchFn: getSession,
  });

  const handleResetClick = async () => {
    const response = confirm(I18n.get('modal_modal_question_delete'));
    if (!response) return;

    await chrome.storage.sync.clear();
  };

  const handleLogoutClick = async () => {
    await removeSession();
    await refetchSessionData();
  };

  const handleMigrateClick = async () => {
    const memoList = await MemoStorage.get();
    const newMemoList = Object.values(memoList).map(memo => {
      const { date, ...props } = memo;
      return props;
    });
    await insertMemo(newMemoList);
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!languageRef.current) return;

    Storage.set(STORAGE_TYPE_OPTION_LANGUAGE, languageRef.current?.value);
    overlay.open(({ unmount }) => <Toast message={I18n.get('toast_save_option')} onClose={unmount} />);
  };

  useEffect(() => {
    if (data) languageRef.current!.value = data;
  }, [data]);

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
            <th>{I18n.get('reset_option')}</th>
            <th>
              <button className="btn btn-outline btn-warning" onClick={handleResetClick} type="button">
                {I18n.get('reset')}
              </button>
            </th>
          </tr>
          <tr>
            <th>데이터 보존</th>
            <th>
              {sessionData ? (
                <button className="btn" onClick={handleLogoutClick}>
                  로그아웃
                </button>
              ) : (
                <a className="btn btn-outline" type="button" href={`${WEB_URL}/login`} target="_blank" rel="noreferrer">
                  로그인
                </a>
              )}
            </th>
          </tr>
          <tr>
            <th>브라우저 저장소에서 전역 저장소로 마이그레이션</th>
            <th>
              {sessionData ? (
                <button className="btn" onClick={handleMigrateClick} type="button">
                  마이그레이션
                </button>
              ) : (
                <span>로그인을 먼저 해주세요.</span>
              )}
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
