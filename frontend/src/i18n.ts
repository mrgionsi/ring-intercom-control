import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './i18n/en.json';
import it from './i18n/it.json';
import es from './i18n/es.json';
import de from './i18n/de.json';
import { detectLanguage } from './i18n/utils';

const STORAGE_KEY = 'ring_lang';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
    es: { translation: es },
    de: { translation: de }
  },
  lng: detectLanguage(
    typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(STORAGE_KEY),
    typeof navigator === 'undefined' ? null : navigator.language
  ),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export function setLanguage(lang: string) {
  const supported = ['en', 'it', 'es', 'de'];
  const safeLang = supported.includes(lang) ? lang : 'en';
  i18n.changeLanguage(safeLang);
  localStorage.setItem(STORAGE_KEY, safeLang);
}

export default i18n;
