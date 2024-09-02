import { Save, Start } from '@src/icons';
import Loading from './Loading';

interface HeaderProps {
  isSummaryLoading: boolean;
  startSummary: () => void;
  startSave: () => void;
}
export default function Header({ isSummaryLoading, startSummary, startSave }: HeaderProps) {
  return (
    <header className="navbar flex justify-center">
      {isSummaryLoading ? (
        <Loading />
      ) : (
        <div className="flex gap-4">
          <button onClick={startSummary}>
            <Start />
          </button>
          <button onClick={startSave}>
            <Save />
          </button>
        </div>
      )}
    </header>
  );
}
