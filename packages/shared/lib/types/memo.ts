export type MemoStorage = {
  [url: string]: MemoType;
};

export type MemoType = {
  url?: string;
  date: string;
  title: string;
  memo: string;
};
