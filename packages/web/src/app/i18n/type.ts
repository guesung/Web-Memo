import { languages } from './settings';

export type Language = (typeof languages)[number];

export type LanguageType = {
  lng: Language;
};

export interface LanguageParams {
  params: LanguageType;
}
