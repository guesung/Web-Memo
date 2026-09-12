/**
 * `color`가 비어 있는 카테고리를 그릴 때 쓰는 폴백 색상
 *
 * @description
 * 브랜드 `--primary`(221 83% 53%)와 같은 값이다. DB `category.color`에 저장되는
 * hex 문자열의 자리를 대신 채우는 값이라 CSS 변수로는 풀 수 없어 상수로 둔다.
 * 사이드바·설정 화면·색상 선택기가 모두 이 값을 읽어야 같은 카테고리가 화면마다
 * 다른 색으로 보이지 않는다.
 */
export const DEFAULT_CATEGORY_COLOR = "#2563eb";
