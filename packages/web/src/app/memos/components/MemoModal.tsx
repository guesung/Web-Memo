import { useSearchParams } from 'next/navigation';

export default function MemoModal() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';

  if (!id) return;
  return (
    <dialog className="modal" id="my_modal_2">
      <div className="modal-box">
        <h3 className="text-lg font-bold">Hello!</h3>
        <p className="py-4">Press ESC key or click outside to close</p>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
