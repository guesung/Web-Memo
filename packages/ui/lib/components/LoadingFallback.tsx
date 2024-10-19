interface LoadingFallbackProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export default function LoadingFallback(props: LoadingFallbackProps) {
  return (
    <p className="flex w-full justify-center" {...props}>
      <span className="loading loading-spinner" />
    </p>
  );
}
