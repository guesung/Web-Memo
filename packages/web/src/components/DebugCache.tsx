import dayjs from 'dayjs';
import RevalidateButton from './RevalidateButton';

interface DebugCacheProps {
  path: string;
}

export default function DebugCache({ path }: DebugCacheProps) {
  return (
    <div>
      {dayjs().valueOf()}
      <RevalidateButton path={path} />
    </div>
  );
}
