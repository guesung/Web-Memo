import { MemoType, SyncStorage, Tab, urlToKey } from '@extension/shared';
import { overlay } from 'overlay-kit';

export const saveMemo = async (memo: string) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  const urlKey = urlToKey(tab.url);

  await SyncStorage.set<MemoType>(urlKey, {
    title: tab.title,
    memo,
    date: new Date().toISOString(),
  });

  overlay.open(({ open, close }) => (
    <div className="toast toast-end">
      <div className="alert alert-success">
        <span>Storage save successfully.</span>
      </div>
    </div>
  ));
};
