import '@src/Options.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Header, OptionForm } from './components';

const queryClient = new QueryClient();
export default function Options() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="mx-auto max-w-[1000px] px-8 text-start text-base">
        <Header />
        <OptionForm />
      </main>
    </QueryClientProvider>
  );
}
