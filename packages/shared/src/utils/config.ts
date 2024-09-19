export const getSafeConfig = (name: string, value: string | undefined): string => {
  if (value === undefined) throw new Error(`${name}이 설정되지 않았습니다.`);
  else return value;
};
