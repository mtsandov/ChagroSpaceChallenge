import { CalendarDays, CloudRain } from 'lucide-react';

import { useI18n } from '../../i18n';

const L = {
  es: {
    title: 'Pase del radar NISAR',
    aria: 'Fecha del pase del radar',
    analysis: 'Fecha usada para el estado de las zonas',
    rainy: 'Lluvia fuerte en esta pasada: el radar no detecta bien el agua. Las zonas quedan como "no concluyente".',
  },
  en: {
    title: 'NISAR radar pass',
    aria: 'Radar pass date',
    analysis: 'Date used for the zone status',
    rainy: 'Heavy rain on this pass: the radar cannot detect water reliably. Zones are marked "inconclusive".',
  },
};

interface Props {
  dates: string[];
  index: number;
  analysisDate?: string;
  unreliable?: string[];
  onChange: (i: number) => void;
}

export default function TimeSlider({ dates, index, analysisDate, unreliable = [], onChange }: Props) {
  const { lang, date } = useI18n();
  const s = L[lang];
  if (dates.length < 2) return null;
  return (
    <div className="card absolute bottom-11 left-1/2 z-[500] w-[min(420px,calc(100%-24px))] -translate-x-1/2 px-4 py-2 sm:bottom-6 sm:left-auto sm:right-3 sm:translate-x-0">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 font-semibold text-slate-600">
          <CalendarDays size={13} /> {s.title}
        </span>
        <span className="font-semibold text-sky-700">{date(dates[index], true)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={dates.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-sky-600"
        aria-label={s.aria}
      />
      <div className="flex justify-between text-[10px] text-slate-500">
        {dates.map((d, i) => (
          <button
            key={d}
            onClick={() => onChange(i)}
            className={`${i === index ? 'font-semibold text-sky-700' : ''} ${d === analysisDate ? 'underline decoration-dotted' : ''}`}
            title={d === analysisDate ? s.analysis : undefined}
          >
            {unreliable.includes(d) && <CloudRain size={10} className="mr-0.5 inline text-amber-600" />}
            {date(d)}
          </button>
        ))}
      </div>
      {unreliable.includes(dates[index]) && (
        <div className="mt-1 text-[10px] leading-snug text-amber-700">
          {s.rainy}
        </div>
      )}
    </div>
  );
}
