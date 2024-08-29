import Logo from '../../public/logo.svg';

interface FloatingButtonProps extends React.HTMLAttributes<HTMLButtonElement> {}

export default function FloatingButton({ ...props }: FloatingButtonProps) {
  return (
    <button
      className="flex items-center justify-center text-xs bg-transparent btn btn-circle tooltip fixed z-50 rounded-full bottom-4 right-4"
      data-tip="Summary"
      {...props}>
      <Logo width={28} height={28} />
    </button>
  );
}
