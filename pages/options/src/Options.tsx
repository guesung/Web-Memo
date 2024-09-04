import { withErrorBoundary, withSuspense } from '@extension/shared';
import '@src/Options.css';
import { OverlayProvider } from 'overlay-kit';
import { Header, OptionForm } from './components';

const Options = () => {
  return (
    <main className="max-w-[1000px] mx-auto text-start text-base px-8">
      <OverlayProvider>
        <Header />
        <OptionForm />
      </OverlayProvider>
    </main>
  );
};

export default withErrorBoundary(withSuspense(Options, <div> Loading ... </div>), <div> Error Occur </div>);
