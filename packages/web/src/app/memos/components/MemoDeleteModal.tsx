import { DialogHTMLAttributes } from 'react';

interface MemoDeleteModalProps extends DialogHTMLAttributes<HTMLDialogElement> {
  onMemoDeleteConfirmClick: () => void;
}

export const MEMO_DELETE_MODAL_ID = 'MEMO_DELETE_MODAL_ID';

export default function MemoDeleteModal({ onMemoDeleteConfirmClick, ...props }: MemoDeleteModalProps) {
  return (
    <dialog id={MEMO_DELETE_MODAL_ID} className="modal" {...props}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">메모 삭제</h3>
        <p className="py-4">메모를 정말로 삭제하시겠습니까?</p>
        <div className="modal-action">
          <form method="dialog">
            <button className="btn">닫기</button>
            <button className="btn" onClick={onMemoDeleteConfirmClick}>
              확인
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
