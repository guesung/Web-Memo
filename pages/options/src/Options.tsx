import '@src/Options.css';
import { OverlayProvider } from 'overlay-kit';
import { Header, OptionForm } from './components';

export default function Options() {
  return (
    <main className="max-w-[1000px] mx-auto text-start text-base px-8">
      <OverlayProvider>
        <Header />
        <OptionForm />
      </OverlayProvider>
    </main>
  );
}
