import { LoaderCircle } from 'lucide-react';

interface LoadingProps extends React.ComponentProps<'svg'> {}
export function Loading(props: LoadingProps) {
  return <LoaderCircle className="animate-spin" size={16} {...props} />;
}
