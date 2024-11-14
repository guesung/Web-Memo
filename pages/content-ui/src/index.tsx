import { formatUrl, getMemoSupabase, insertMemo, isProduction } from '@extension/shared/utils';
import {
  getSupabaseClient,
  OPEN_SIDE_PANEL_ID,
  requestGetTabs,
  responsePageContent,
} from '@extension/shared/utils/extension';
import { toast } from 'react-toastify';
import { OpenSidePanelButton } from './components';
import { attachShadowTree } from './utils';

const renderOpenSidePanelButton = async () => {
  if (isProduction) return;

  attachShadowTree({
    shadowHostId: OPEN_SIDE_PANEL_ID,
    shadowTree: <OpenSidePanelButton />,
  });
};

responsePageContent();

renderOpenSidePanelButton();

window.addEventListener('keydown', async event => {
  const isAddWishList = event.altKey && (event.key === 'å' || event.key === 'a');
  if (!isAddWishList) return;

  const supabaseClient = await getSupabaseClient();
  const tab = await requestGetTabs();

  const { data: memosData } = await getMemoSupabase(supabaseClient);

  toast.success('새로고침이 완료되었습니다.');

  if (memosData?.some(memo => memo.url === formatUrl(tab.url))) return;

  const memo = {
    title: tab.title,
    favIconUrl: tab?.favIconUrl,
    url: formatUrl(tab.url),
    memo: '',
    category: '',
  };

  await insertMemo(supabaseClient, memo);
});
