import 'driver.js/dist/driver.css';

import { useDidMount } from '@extension/shared/hooks';
import { checkLocalStorageTrue, setLocalStorageTrue } from '@extension/shared/modules/local-storage';
import { requestGetSidePanelOpen } from '@extension/shared/utils/extension';
import { isMac } from '@src/utils';
import { driver } from 'driver.js';

import { LanguageType } from '../i18n';
import useTranslation from '../i18n/client';

interface UseGuideProps extends LanguageType {}

export default function useGuide({ lng }: UseGuideProps) {
  const { t } = useTranslation(lng);

  const createDriver = () =>
    driver({
      showProgress: true,
      allowClose: false,
      popoverClass: 'driverjs-theme',
      nextBtnText: t('guide.next'),
      doneBtnText: t('guide.done'),
      prevBtnText: t('guide.prev'),
      steps: [
        {
          popover: {
            title: t('guide.welcome.title'),
            description: t('guide.welcome.description', { key: isMac ? 'Option' : 'Alt' }),
            onPopoverRender: () => {
              const interval = setInterval(() => {
                requestGetSidePanelOpen(() => {
                  if (driverObj.getActiveIndex() !== 0) return;
                  driverObj.moveNext();
                });
              }, 500);
              driverObj.destroy = () => clearInterval(interval);
            },
          },
        },
        {
          popover: {
            title: t('guide.save.title'),
            description: t('guide.save.description', { key: isMac ? 'Command' : 'Ctrl' }),
          },
        },
        {
          element: '#refresh',
          popover: {
            title: t('guide.check.title'),
            description: t('guide.check.description'),
            onNextClick: () => {
              setLocalStorageTrue('guide');
              driverObj.destroy();
            },
          },
        },
      ],
    });

  const driverObj = createDriver();

  useDidMount(() => {
    if (checkLocalStorageTrue('guide')) return;

    driverObj.drive();
  });

  return { driverObj };
}
