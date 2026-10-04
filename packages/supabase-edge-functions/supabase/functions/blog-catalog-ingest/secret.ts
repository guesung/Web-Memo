/**
 * 수집 secret 비교.
 * @description 두 값을 SHA-256으로 같은 길이로 만든 뒤 전 구간을 비교해, 길이나 앞부분 일치 여부가 응답 시간으로 새지 않게 한다.
 * 값을 로그에 남기지 않는다.
 */
export const isSecretMatch = async (
  providedSecret: string | null,
  expectedSecret: string,
): Promise<boolean> => {
  const encoder = new TextEncoder();
  const [providedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(providedSecret ?? "")),
    crypto.subtle.digest("SHA-256", encoder.encode(expectedSecret)),
  ]);
  const providedBytes = new Uint8Array(providedDigest);
  const expectedBytes = new Uint8Array(expectedDigest);
  let difference = providedSecret === null ? 1 : 0;

  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= providedBytes[index] ^ expectedBytes[index];
  }

  return difference === 0;
};
