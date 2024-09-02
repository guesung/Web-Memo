export default function Memo() {
  return (
    <div className="flex-1">
      <label className="form-control">
        <div className="label">
          <span className="label-text">메모</span>
        </div>
        <textarea className="textarea textarea-bordered h-24" placeholder="memo" />
        <div className="label">
          <span className="label-text-alt">0/100</span>
          <span className="label-text-alt">Save</span>
        </div>
      </label>
    </div>
  );
}
