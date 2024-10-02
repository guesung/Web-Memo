import { WEB_URL } from '@extension/shared/constants';
import { TopRightArrow } from '@src/icons';

export default function LoginSection() {
  return (
    <div className="h-full justify-center items-center flex flex-col">
      <p>메모 기능을 이용하려면 로그인이 필요합니다.</p>

      <button
        type="button"
        className="cursor-pointer"
        onClick={() => {
          window.open(`${WEB_URL}/login`, '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes');
        }}>
        로그인하러가기
        <TopRightArrow />
      </button>
    </div>
  );
}
