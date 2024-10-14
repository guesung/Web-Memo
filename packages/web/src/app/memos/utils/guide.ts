import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const driverObj = driver({
  showProgress: true,
  allowClose: false,
  popoverClass: 'driverjs-theme',
  steps: [
    {
      popover: {
        title: '환영합니다 🎉',
        description: `메모를 한 번 해볼까요?\nOption + S를 눌러 사이드 패널을 열어보세요 !`,
      },
    },
    {
      popover: {
        title: '메모 저장',
        description: `메모를 입력하시고, Command + S를 눌러 저장해보세요.\n메모 테두리가 파랑색 테두리에서 기본 테두리로 돌아왔다면 저장에 성공한 거에요!\n또한, 3초마다 자동으로 저장되니 안심하세요 ☺️`,
      },
    },
    {
      element: '#refresh',
      popover: {
        title: '메모 확인',
        description: '이제, 새로 고침을 눌러 저장된 메모를 확인해볼까요?',
      },
    },
  ],
});
