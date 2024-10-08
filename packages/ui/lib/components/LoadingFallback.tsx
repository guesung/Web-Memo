interface LoadingFallbackProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export default function LoadingFallback(props: LoadingFallbackProps) {
  return (
    <p className="w-full justify-center flex" {...props}>
      <span className="loading loading-spinner" />
    </p>
  );
}
