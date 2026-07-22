import { createContext, useContext, useEffect, useState } from 'react';
import { t as translate, DEFAULT_LANG, LANGUAGES } from '../i18n.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('kf_lang') || DEFAULT_LANG);

  // Apply direction from `lang` itself, so a page LOADED in Arabic is RTL too.
  // Doing this only inside changeLang meant direction was correct after clicking
  // the language switcher but silently lost on the next reload.
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('kf_lang', code);
  };

  const t = (key) => translate(key, lang);
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t, currentLang, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
