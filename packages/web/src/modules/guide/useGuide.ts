import 'driver.js/dist/driver.css';
import { driver } from 'driver.js';
import { requestGetSidePanelOpen } from '@extension/shared/utils/extension';
import { checkLocalStorageTrue, setLocalStorageTrue } from '@extension/shared/modules/local-storage';
import useTranslation from '../i18n/client';
import { LanguageType } from '../i18n';
import { useDidMount } from '@extension/shared/hooks';

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
            description: t('guide.welcome.description'),
            onPopoverRender: () => {
              setInterval(() => {
                requestGetSidePanelOpen(() => {
                  if (driverObj.getActiveIndex() !== 0) return;
                  driverObj.moveNext();
                });
              }, 500);
            },
          },
        },
        {
          popover: {
            title: t('guide.save.title'),
            description: t('guide.save.description'),
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
