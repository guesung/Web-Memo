import '@src/Options.css';
import { OverlayProvider } from 'overlay-kit';
import { Header, OptionForm } from './components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
export default function Options() {
  return (
    <QueryClientProvider client={queryClient}>
      <OverlayProvider>
        <main className="max-w-[1000px] mx-auto text-start text-base px-8">
          <Header />
          <OptionForm />
        </main>
      </OverlayProvider>
    </QueryClientProvider>
  );
}
