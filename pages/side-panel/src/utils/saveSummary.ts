import { SummaryType, Storage, Tab, urlToKey } from '@extension/shared';

export const startSave = async (summary: string) => {
  const tab = await Tab.get();

  if (!tab.url || !tab.title) throw new Error('Save Failed: Invalid URL');

  const urlKey = urlToKey(tab.url);

  await Storage.set<SummaryType>(urlKey, {
    title: tab.title,
    summary,
    date: new Date().toISOString(),
  });

  // overlay.open(({ open, close }) => {
  //   return (
  //     <div className="toast toast-end">
  //       <div className="alert alert-success">
  //         <span>Storage save successfully.</span>
  //       </div>
  //     </div>
  //   );
  // });
};
