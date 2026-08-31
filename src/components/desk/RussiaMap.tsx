import { useMemo, useState } from 'react';
import {
  DISTRICTS,
  CITIES,
  YAKUTIA_PATH,
  RUSSIA_PATH,
  MAP_W,
  MAP_H,
  project,
} from '@/data/geo';
import { ProjectObject, STATUS_LABEL } from '@/data/store';
import { cn } from '@/lib/utils';
import Icon from '@/components/ui/icon';

interface RussiaMapProps {
  objects: ProjectObject[];
  onPick?: (o: ProjectObject) => void;
}

const PIN_TONE: Record<ProjectObject['status'], string> = {
  work: 'fill-accent',
  plan: 'fill-warning',
  done: 'fill-success',
  risk: 'fill-destructive',
};

const FULL: [number, number, number, number] = [0, 0, MAP_W, MAP_H];

const RussiaMap = ({ objects, onPick }: RussiaMapProps) => {
  const [district, setDistrict] = useState<string | null>(null);
  const [hover, setHover] = useState<ProjectObject | null>(null);

  const active = DISTRICTS.find((d) => d.id === district) ?? null;

  const view = useMemo<[number, number, number, number]>(() => {
    if (!active) return FULL;
    const [x0, y0, x1, y1] = active.box;
    const pad = Math.max((x1 - x0) * 0.06, 8);
    const w = x1 - x0 + pad * 2;
    const h = y1 - y0 + pad * 2;
    const ratio = MAP_W / MAP_H;
    let vw = w;
    let vh = h;
    if (w / h < ratio) vw = h * ratio;
    else vh = w / ratio;
    return [x0 - pad - (vw - w) / 2, y0 - pad - (vh - h) / 2, vw, vh];
  }, [active]);

  const zoom = MAP_W / view[2];
  const k = 1 / zoom;

  const shown = district ? objects.filter((o) => o.district === district) : objects;
  const cities = useMemo(
    () =>
      district
        ? CITIES.filter((c) => c.d === district).sort((a, b) => b.p - a.p)
        : CITIES.filter((c) => c.p >= 700000),
    [district],
  );

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => setDistrict(null)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-[0.8em] uppercase tracking-[0.06em] transition-colors',
            district === null
              ? 'bg-accent text-accent-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-border',
          )}
        >
          Вся Россия
        </button>
        {DISTRICTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDistrict(d.id === district ? null : d.id)}
            className={cn(
              'rounded-sm px-2.5 py-1 text-[0.8em] uppercase tracking-[0.06em] transition-colors',
              district === d.id
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-border',
            )}
          >
            {d.short}
          </button>
        ))}
      </div>

      <div className="relative bg-deep">
        <svg
          viewBox={view.join(' ')}
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto max-h-[46vh] w-full transition-[viewBox] duration-500"
          role="img"
          aria-label="Карта объектов по России"
        >
          <path d={RUSSIA_PATH} className="fill-white/[0.08]" fillRule="evenodd" />

          {DISTRICTS.map((d) => {
            const on = district === d.id;
            return (
              <path
                key={d.id}
                d={d.d}
                fillRule="evenodd"
                onClick={() => setDistrict(on ? null : d.id)}
                className={cn(
                  'cursor-pointer transition-colors duration-300',
                  on
                    ? 'fill-accent/25 stroke-accent'
                    : 'fill-transparent stroke-white/40 hover:fill-white/[0.1]',
                )}
                strokeWidth={(on ? 1.5 : 1) * k}
                strokeDasharray={`${7 * k} ${3 * k} ${2 * k} ${3 * k}`}
                strokeLinejoin="round"
              />
            );
          })}

          <path
            d={YAKUTIA_PATH}
            fillRule="evenodd"
            className={cn(
              'pointer-events-none transition-opacity duration-300',
              district && district !== 'fe' ? 'opacity-25' : 'opacity-100',
            )}
            fill="hsl(var(--accent) / 0.2)"
            stroke="hsl(var(--accent))"
            strokeWidth={1.4 * k}
            strokeDasharray={`${7 * k} ${3 * k} ${2 * k} ${3 * k}`}
            strokeLinejoin="round"
          />

          <path
            d={RUSSIA_PATH}
            fillRule="evenodd"
            className="pointer-events-none fill-none stroke-white/70"
            strokeWidth={1.4 * k}
            strokeLinejoin="round"
          />

          {!district &&
            (() => {
              const [x, y] = project(125, 66.5);
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  className="pointer-events-none fill-accent text-[13px] uppercase tracking-[0.2em]"
                >
                  Якутия
                </text>
              );
            })()}

          {!district &&
            DISTRICTS.map((d) => {
              const [x, y] = project(d.label[0], d.label[1]);
              return (
                <text
                  key={d.id}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  className="pointer-events-none fill-white/50 text-[11px] uppercase tracking-[0.14em]"
                >
                  {d.short}
                </text>
              );
            })}

          <g className="pointer-events-none">
            {cities.map((c) => {
              const [x, y] = project(c.lon, c.lat);
              const big = c.p >= 250000;
              return (
                <g key={`${c.n}-${c.lon}`}>
                  <circle
                    cx={x}
                    cy={y}
                    r={(big ? 2.6 : 1.7) * k}
                    className={big ? 'fill-white/90' : 'fill-white/55'}
                  />
                  <text
                    x={x + 4 * k}
                    y={y + 3.2 * k}
                    style={{ fontSize: `${(big ? 11 : 9) * k}px` }}
                    className={big ? 'fill-white/90' : 'fill-white/60'}
                  >
                    {c.n}
                  </text>
                </g>
              );
            })}
          </g>

          {shown.map((o) => {
            const [x, y] = project(o.lon, o.lat);
            const on = hover?.id === o.id;
            return (
              <g
                key={o.id}
                transform={`translate(${x} ${y}) scale(${k})`}
                className="cursor-pointer"
                onMouseEnter={() => setHover(o)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPick?.(o)}
              >
                <circle r={on ? 16 : 11} className={cn(PIN_TONE[o.status], 'opacity-20')} />
                <path
                  d="M0 2 L-6 -8 A6.6 6.6 0 1 1 6 -8 Z"
                  className={cn(PIN_TONE[o.status], 'stroke-white/70')}
                  strokeWidth={1}
                />
                <circle cy={-11} r={2.4} className="fill-deep" />
                <text
                  y={12}
                  textAnchor="middle"
                  style={{ fontSize: '10px' }}
                  className="fill-white"
                >
                  {o.title}
                </text>
              </g>
            );
          })}
        </svg>

        {active && (
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-sm border border-border/40 bg-deep-2/95 px-3 py-2 text-[0.8em] uppercase tracking-[0.08em] text-deep-foreground">
            <Icon name="ZoomIn" size={14} className="text-accent" />
            {active.name} · {cities.length} городов
            <button
              type="button"
              onClick={() => setDistrict(null)}
              className="ml-1 rounded-sm bg-accent px-2 py-0.5 text-accent-foreground"
            >
              Сброс
            </button>
          </div>
        )}

        {hover && (
          <div className="pointer-events-none absolute left-3 top-3 max-w-[280px] rounded-sm border border-accent/40 bg-deep-2/95 p-3 text-deep-foreground shadow-lg">
            <div className="flex items-center gap-2">
              {hover.customerLogo ? (
                <img
                  src={hover.customerLogo}
                  alt=""
                  className="h-7 w-7 flex-none rounded-sm bg-white object-contain p-0.5"
                />
              ) : (
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                  <Icon name="Building2" size={14} />
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate font-head text-[0.95em] uppercase tracking-[0.04em]">
                  {hover.title}
                </div>
                <div className="truncate text-[0.8em] text-deep-dim">{hover.customer}</div>
              </div>
            </div>
            <div className="mt-2 text-[0.8em] text-deep-dim">
              {hover.regionName} · {STATUS_LABEL[hover.status]} · готовность {hover.progress}%
            </div>
          </div>
        )}

        {shown.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-sm bg-deep-2/90 px-4 py-2 text-[0.85em] uppercase tracking-[0.1em] text-deep-dim">
              Объектов в этой зоне нет
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-border px-4 py-2.5 text-[0.78em] uppercase tracking-[0.08em] text-muted-foreground">
        {(
          [
            ['work', 'bg-accent'],
            ['plan', 'bg-warning'],
            ['risk', 'bg-destructive'],
            ['done', 'bg-success'],
          ] as const
        ).map(([key, c]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', c)} />
            {STATUS_LABEL[key]}
          </span>
        ))}
        <span className="ml-auto hidden sm:inline">Города от 20 тыс. жителей</span>
      </div>
    </div>
  );
};

export default RussiaMap;
