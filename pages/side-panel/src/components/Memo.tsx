import { useUrl } from '@extension/shared';
import useGetMemo from '@src/hooks/useGetMemo';
import { saveMemo } from '@src/utils';
import { Toast } from '@src/components';
import { overlay } from 'overlay-kit';
import { useState } from 'react';

export default function Memo() {
  const { url } = useUrl();
  const { memo: initialMemo } = useGetMemo({ url });
  const [memo, setMemo] = useState(initialMemo?.memo ?? '');

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
          <span className="label-text">메모</span>
        </div>
        <textarea
          className="textarea textarea-bordered h-full resize-none"
          placeholder="memo"
          value={memo}
          onChange={handleTextAreaChange}
        />
        <div className="label">
          <span className="label-text-alt">{memo.length}/1,000</span>
          <button className="label-text-alt" type="submit">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
