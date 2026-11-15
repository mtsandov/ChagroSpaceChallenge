import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { messages, type Lang, type MessageKey } from './messages';

export type { Lang, MessageKey };

const STORAGE_KEY = 'chagro.lang';

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const text: string = messages[lang][key] ?? messages.es[key] ?? key;
  return vars ? text.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? '')) : text;
}

export function translateLoose(lang: Lang, key: string, fallback?: string): string {
  return key in messages[lang] ? messages[lang][key as MessageKey] : (fallback ?? key);
}

export const localeOf = (lang: Lang) => (lang === 'en' ? 'en-US' : 'es-EC');

export function shortDate(iso: string, lang: Lang, withYear = false): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(localeOf(lang), {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function zoneName(name: string, lang: Lang): string {
  const m = name.match(/(\d+)\s*$/);
  return m ? translate(lang, 'zone.name', { n: m[1] }) : name;
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  date: (iso: string, withYear?: boolean) => string;
  zone: (name: string) => string;
  tx: (key: string, fallback?: string) => string;
  locale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      date: (iso, withYear) => shortDate(iso, lang, withYear),
      zone: (name) => zoneName(name, lang),
      tx: (key, fallback) => translateLoose(lang, key, fallback),
      locale: localeOf(lang),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  return ctx;
}
