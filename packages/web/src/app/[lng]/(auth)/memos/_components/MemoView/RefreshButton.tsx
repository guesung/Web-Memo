import { QUERY_KEY } from '@extension/shared/constants';
import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import { setLocalStorageTrue } from '@extension/shared/modules/local-storage';
import { Button, toast } from '@src/components/ui';
import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/client';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCwIcon } from 'lucide-react';

interface RefreshButtonProps extends LanguageType {}

export default function RefreshButton({ lng }: RefreshButtonProps) {
  const { t } = useTranslation(lng);
  const queryClient = useQueryClient();
  const { driverObj } = useGuide({ lng });

  const handleRefreshClick = async () => {
    driverObj.moveNext();
    setLocalStorageTrue('guide');

    await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    toast({ title: t('toastTitle.refresh') });
    await ExtensionBridge.requestRefetchTheMemos();
  };

  return (
    <Button size="icon" variant="outline" id="refresh" onClick={handleRefreshClick}>
      <RefreshCwIcon size={16} />
    </Button>
  );
}
