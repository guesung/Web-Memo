import { languages } from './settings';

export type LanguageType = {
  lng: (typeof languages)[number];
};

export interface LangageParams {
  params: LanguageType;
}
