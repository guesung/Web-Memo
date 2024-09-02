import { startSave } from '@src/utils';
import { useState } from 'react';

export default function Memo() {
  const [memo, setMemo] = useState('');

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startSave(memo);
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
