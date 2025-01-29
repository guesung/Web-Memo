import { QUERY_KEY } from '@extension/shared/constants';
import { ExtensionBridge } from '@extension/shared/modules/extension-bridge';
import { setLocalStorageTrue } from '@extension/shared/modules/local-storage';
import { Button, toast } from '@src/components/ui';
import { useGuide } from '@src/modules/guide';
import { LanguageType } from '@src/modules/i18n';
import useTranslation from '@src/modules/i18n/util.client';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCwIcon } from 'lucide-react';
import { memo } from 'react';

interface RefreshButtonProps extends LanguageType {}

export default memo(function MemoRefreshButton({ lng }: RefreshButtonProps) {
  const { t } = useTranslation(lng);
  const queryClient = useQueryClient();
  const { driverObj } = useGuide({ lng });

  const handleRefreshClick = async () => {
    driverObj.moveNext();
    setLocalStorageTrue('guide');

    await queryClient.invalidateQueries({ queryKey: QUERY_KEY.memos() });
    toast({ title: t('toastTitle.refresh') });
  };

  return (
    <Button size="icon" variant="outline" id="refresh" onClick={handleRefreshClick}>
      <RefreshCwIcon size={16} />
    </Button>
  );
});
