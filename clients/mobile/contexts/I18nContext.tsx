import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, initI18n } from '../lib/i18n';

interface I18nContextType {
  isRTL: boolean;
  toggleLanguage: () => Promise<void>;
  ready: boolean;
}

const I18nContext = createContext<I18nContextType>({
  isRTL: false,
  toggleLanguage: async () => {},
  ready: false,
});

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const { i18n } = useTranslation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setReady(true));
  }, []);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  const isRTL = i18n.language === 'ar';

  return (
    <I18nContext.Provider value={{ isRTL, toggleLanguage, ready }}>
      {ready ? children : null}
    </I18nContext.Provider>
  );
};

export const useI18nContext = () => useContext(I18nContext);
