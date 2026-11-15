import { useI18n, type Lang } from '../../i18n';

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={`flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold ${className}`}
      role="group"
      aria-label={lang === 'en' ? 'Language' : 'Idioma'}
    >
      {(['en', 'es'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-md px-1.5 py-1 uppercase sm:px-2 ${lang === l ? 'bg-white text-brand-700 shadow' : 'text-slate-500'}`}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
