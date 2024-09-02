export type SummaryStorage = {
  [url: string]: SummaryType;
};

export type SummaryType = {
  date: string;
  title: string;
  summary: string;
  url?: string;
};
