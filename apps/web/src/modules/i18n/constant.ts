export const DEFAULT_LANGUAGE = "en";
export const SUPPORTED_LANGUAGES = [DEFAULT_LANGUAGE, "ko"] as const;
export const defaultNS = "translation";
export const cookieName = "i18next";

/**
 * 미들웨어가 요청 경로에서 뽑은 로케일을 담아 두는 요청 헤더 이름.
 *
 * @description
 * 루트 레이아웃(`app/layout.tsx`)은 동적 세그먼트(`[lng]`) 밖에 있어 `params.lng`를
 * 받을 수 없다. `<html lang>`을 요청 시점에 서버에서 맞추려면 미들웨어가 URL에서 이미
 * 확정한 로케일을 헤더로 넘겨야 한다.
 */
export const LANGUAGE_HEADER_NAME = "x-lng";
