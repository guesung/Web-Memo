import { defaultNS, fallbackLng, languages } from '.';

export const getOptions = (lng = fallbackLng, ns = defaultNS) => ({
  supportedLngs: languages,
  fallbackLng,
  lng,
  fallbackNS: defaultNS,
  defaultNS,
  ns,
});
