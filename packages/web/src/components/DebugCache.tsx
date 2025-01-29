import dayjs from 'dayjs';

interface DebugCacheProps {
  path: string;
}

export default function DebugCache({ path }: DebugCacheProps) {
  return <div>{dayjs().valueOf()}</div>;
}
