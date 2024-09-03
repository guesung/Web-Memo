import { Tab } from '../../bridge';
import useFetch from './useFetch';

export default function useUrl() {
  const { data: url } = useFetch<string>({
    fetchFn: async () => {
      const tab = await Tab.get();
      return tab.url ?? '';
    },
    defaultValue: '',
  });

  return { url };
}
