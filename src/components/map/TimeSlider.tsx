import { CalendarDays, CloudRain } from 'lucide-react';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export const shortDate = (d: string) => `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]}`;

interface Props {
  dates: string[];
  index: number;
  analysisDate?: string;
  unreliable?: string[];
  onChange: (i: number) => void;
}

export default function TimeSlider({ dates, index, analysisDate, unreliable = [], onChange }: Props) {
  if (dates.length < 2) return null;
  return (
    <div className="card absolute bottom-11 left-1/2 z-[500] w-[min(420px,calc(100%-24px))] -translate-x-1/2 px-4 py-2 sm:bottom-6 sm:left-auto sm:right-3 sm:translate-x-0">
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1 font-semibold text-slate-600">
          <CalendarDays size={13} /> Pase del radar NISAR
        </span>
        <span className="font-semibold text-sky-700">{shortDate(dates[index])} {dates[index].slice(0, 4)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={dates.length - 1}
        step={1}
        value={index}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-sky-600"
        aria-label="Fecha del pase del radar"
      />
      <div className="flex justify-between text-[10px] text-slate-500">
        {dates.map((d, i) => (
          <button
            key={d}
            onClick={() => onChange(i)}
            className={`${i === index ? 'font-semibold text-sky-700' : ''} ${d === analysisDate ? 'underline decoration-dotted' : ''}`}
            title={d === analysisDate ? 'Fecha usada para el estado de las zonas' : undefined}
          >
            {unreliable.includes(d) && <CloudRain size={10} className="mr-0.5 inline text-amber-600" />}
            {shortDate(d)}
          </button>
        ))}
      </div>
      {unreliable.includes(dates[index]) && (
        <div className="mt-1 text-[10px] leading-snug text-amber-700">
          Lluvia fuerte en esta pasada: el radar no detecta bien el agua. Las zonas quedan como "no concluyente".
        </div>
      )}
    </div>
  );
}
