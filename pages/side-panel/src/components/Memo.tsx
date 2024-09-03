import { Tab, useFetch } from '@extension/shared';
import { Toast } from '@src/components';
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
    overlay.open(({ open, unmount }) => <Toast message="Saved" onClose={unmount} />);
  };

  return (
    <div className="flex-1">
      <form className="form-control h-full" onSubmit={handleFormSubmit}>
        <div className="label">
          <span className="label-text w-full">메모</span>
          <span className="label-text truncate">{tab?.title}</span>
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
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
