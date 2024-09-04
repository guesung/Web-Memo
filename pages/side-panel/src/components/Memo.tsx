import { I18n, Tab, useFetch } from '@extension/shared';
import { Toast } from '@extension/ui';
import useGetMemo from '@src/hooks/useGetMemo';
import { saveMemo } from '@src/utils';
import { overlay } from 'overlay-kit';
import { useEffect, useState } from 'react';

export default function Memo() {
  const { data: tab } = useFetch<chrome.tabs.Tab>({
    fetchFn: Tab.get,
  });
  const { memo: initialMemo } = useGetMemo({ url: tab.url ?? '' });
  const [memo, setMemo] = useState(() => initialMemo?.memo);

  useEffect(() => {
    setMemo(initialMemo?.memo);
  }, [initialMemo]);

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveMemo(memo);
    overlay.open(({ unmount }) => <Toast message="Saved" onClose={unmount} />);
  };

  return (
    <div className="flex-1">
      <form className="form-control h-full" onSubmit={handleFormSubmit}>
        <div className="label">
          <span className="label-text whitespace-nowrap font-bold">{I18n.get('memo')}</span>
          <span className="mx-1">|</span>
          <span className="label-text truncate w-full text-right text-neutral-content">{tab?.title}</span>
        </div>
        <textarea
          className="textarea textarea-bordered h-full resize-none"
          placeholder="memo"
          value={memo}
          onChange={handleTextAreaChange}
        />
        <div className="label">
          <span className="label-text-alt">{memo?.length ?? 0}/1,000</span>
          <button className="label-text-alt" type="submit">
            {I18n.get('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
