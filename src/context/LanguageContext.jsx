import { createContext, useContext, useState } from 'react';
import { t as translate, DEFAULT_LANG, LANGUAGES } from '../i18n.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('kf_lang') || DEFAULT_LANG);

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('kf_lang', code);
    // Apply RTL for Arabic
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
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
