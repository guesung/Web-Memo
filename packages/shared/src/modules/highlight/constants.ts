/**
 * 앵커가 앞뒤 문맥으로 보관할 길이.
 * @description createAnchor가 이 길이로 자르고 matchQuote가 같은 길이로 비교하므로
 * 두 곳이 반드시 같은 값을 봐야 한다.
 */
export const CONTEXT_LENGTH = 32;
