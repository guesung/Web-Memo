import { WEB_URL } from '@extension/shared/constants';
import { Tab } from '@extension/shared/utils/extension';
import { TopRightArrow } from '@src/icons';

export default function LoginSection() {
  return (
    <div className="h-full justify-center items-center flex flex-col">
      <p>메모 기능을 이용하려면 로그인이 필요합니다.</p>

      <button
        type="button"
        className="cursor-pointer flex items-center gap-2"
        onClick={() => {
          Tab.create({ url: `${WEB_URL}/login` });
        }}>
        로그인하러가기
        <TopRightArrow height={16} width={16} />
      </button>
    </div>
  );
}
