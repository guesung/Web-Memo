import { cn } from '@/utils';
import { LoaderCircle } from 'lucide-react';

interface LoadingProps extends React.ComponentProps<'svg'> {}
export function Loading(props: LoadingProps) {
  return <LoaderCircle {...props} className={cn('m-auto animate-spin', props.className)} size={16} />;
}
