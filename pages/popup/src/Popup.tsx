import { withSuspense } from '@extension/shared';

const Popup = () => {
  return (
    <header className="px-4 py-2 text-center">
      <p className="text-nowrap text-lg">Web Memos</p>
      <div className="h-4" />
      <p className="text-nowrap">
        <span>v0.0.2</span>
        <span> | </span>
        <span>last update : 24.08.26</span>
      </p>
    </header>
  );
};

export default withSuspense(Popup, <div> Loading ... </div>);
