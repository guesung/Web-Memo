import '@src/Options.css';
import { OverlayProvider } from 'overlay-kit';
import { Header, OptionForm } from './components';

export default function Options() {
  return (
    <OverlayProvider>
      <main className="max-w-[1000px] mx-auto text-start text-base px-8">
        <Header />
        <OptionForm />
      </main>
    </OverlayProvider>
  );
}
