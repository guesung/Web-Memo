import '../global.css';

import { Button } from './components';
import { Toaster } from './components/toaster';
import { useToast } from './hooks';

function App() {
  const { toast } = useToast();

  return (
    <main>
      <Toaster />
      <Button
        onClick={() => {
          toast({ title: '안녕하세요' });
        }}>
        버튼
      </Button>
    </main>
  );
}

export default App;
