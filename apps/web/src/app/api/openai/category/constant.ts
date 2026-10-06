/** 카테고리 추천에 사용하는 Jev 모델 버전입니다. */
export const JEV_MODEL = "jev-1.13.0" as const;

/** Jev 카테고리 판정 요청의 최대 대기 시간입니다. */
export const JEV_TIMEOUT = 3000;

/** Jev Choice에 전달하는 기존 카테고리의 최대 개수입니다. */
export const JEV_MAX_CHOICES = 255;

/** Jev에 전달할 웹 본문의 최대 길이입니다. */
export const PAGE_CONTENT_MAX_LENGTH = 2000;
