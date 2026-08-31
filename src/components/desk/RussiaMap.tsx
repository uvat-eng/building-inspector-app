import { useMemo, useRef, useState } from 'react';
import {
  DISTRICTS,
  CITIES,
  YAKUTIA_PATH,
  RUSSIA_PATH,
  MAP_W,
  MAP_H,
  project,
  unproject,
} from '@/data/geo';
import { ProjectObject, STATUS_LABEL } from '@/data/store';
import { cn } from '@/lib/utils';
import Icon from '@/components/ui/icon';

interface RussiaMapProps {
  objects: ProjectObject[];
  onPick?: (o: ProjectObject) => void;
  pickMode?: boolean;
  marker?: { lon: number; lat: number } | null;
  onPoint?: (lon: number, lat: number) => void;
  focusDistrict?: string | null;
  height?: string;
}

const PIN_TONE: Record<ProjectObject['status'], string> = {
  work: 'fill-accent',
  plan: 'fill-warning',
  done: 'fill-success',
  risk: 'fill-destructive',
};

const FULL: [number, number, number, number] = [0, 0, MAP_W, MAP_H];

const RussiaMap = ({
  objects,
  onPick,
  pickMode = false,
  marker = null,
  onPoint,
  focusDistrict = null,
  height = 'max-h-[46vh]',
}: RussiaMapProps) => {
  const [district, setDistrict] = useState<string | null>(focusDistrict);
  const [hover, setHover] = useState<ProjectObject | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const k = view[2] / MAP_W;

  const shown = district ? objects.filter((o) => o.district === district) : objects;
  const cities = useMemo(
    () =>
      district
        ? CITIES.filter((c) => c.d === district).sort((a, b) => b.p - a.p)
        : CITIES.filter((c) => c.p >= 700000),
    [district],
  );

  const tap = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!pickMode || !onPoint || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const p = 'touches' in e ? e.changedTouches[0] : e;
    const px = ((p.clientX - rect.left) / rect.width) * view[2] + view[0];
    const py = ((p.clientY - rect.top) / rect.height) * view[3] + view[1];
    const [lon, lat] = unproject(px, py);
    onPoint(lon, lat);
  };

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

      <div className="relative bg-[#f2f2f2]">
        <svg
          ref={svgRef}
          viewBox={view.join(' ')}
          preserveAspectRatio="xMidYMid meet"
          onClick={tap}
          onTouchEnd={tap}
          className={cn('block h-auto w-full', height, pickMode && 'cursor-crosshair touch-none')}
          role="img"
          aria-label="Карта объектов по России"
        >
          <defs>
            <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e6e6e6" />
            </linearGradient>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M24 0 H0 V24" fill="none" stroke="#9a9a9a" strokeWidth="0.3" opacity="0.35" />
            </pattern>
            <clipPath id="land-clip">
              <path d={RUSSIA_PATH} fillRule="evenodd" />
            </clipPath>
          </defs>

          <path d={RUSSIA_PATH} fill="url(#land)" fillRule="evenodd" />
          <g clipPath="url(#land-clip)">
            <rect x={view[0]} y={view[1]} width={view[2]} height={view[3]} fill="url(#grid)" />
          </g>

          {DISTRICTS.map((d) => {
            const on = district === d.id;
            return (
              <path
                key={d.id}
                d={d.d}
                fillRule="evenodd"
                onClick={() => !pickMode && setDistrict(on ? null : d.id)}
                className={cn(
                  'transition-colors duration-300',
                  pickMode ? 'pointer-events-none' : 'cursor-pointer',
                  on ? 'fill-accent/10' : 'fill-transparent hover:fill-black/[0.07]',
                )}
                stroke={on ? 'hsl(var(--accent))' : '#1a1a1a'}
                strokeOpacity={on ? 1 : 0.75}
                strokeWidth={(on ? 1.6 : 1) * k}
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
            fill="hsl(var(--accent) / 0.12)"
            stroke="hsl(var(--accent))"
            strokeWidth={1.4 * k}
            strokeDasharray={`${7 * k} ${3 * k} ${2 * k} ${3 * k}`}
            strokeLinejoin="round"
          />

          <path
            d={RUSSIA_PATH}
            fillRule="evenodd"
            className="pointer-events-none fill-none"
            stroke="#111111"
            strokeWidth={1.4 * k}
            strokeLinejoin="round"
          />

          {!district && (
            <>
              {(() => {
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
              {DISTRICTS.map((d) => {
                const [x, y] = project(d.label[0], d.label[1]);
                return (
                  <text
                    key={d.id}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    className="pointer-events-none fill-black/55 text-[11px] uppercase tracking-[0.14em]"
                  >
                    {d.short}
                  </text>
                );
              })}
            </>
          )}

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
                    fill="#1a1a1a"
                    fillOpacity={big ? 0.95 : 0.65}
                  />
                  <text
                    x={x + 4 * k}
                    y={y + 3.2 * k}
                    style={{ fontSize: `${(big ? 11 : 9) * k}px` }}
                    fill="#111111"
                    fillOpacity={big ? 0.95 : 0.7}
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
                className={pickMode ? 'pointer-events-none' : 'cursor-pointer'}
                onMouseEnter={() => setHover(o)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPick?.(o)}
              >
                <circle r={on ? 16 : 11} className={cn(PIN_TONE[o.status], 'opacity-25')} />
                <path
                  d="M0 2 L-6 -8 A6.6 6.6 0 1 1 6 -8 Z"
                  className={cn(PIN_TONE[o.status], 'stroke-white')}
                  strokeWidth={1}
                />
                <circle cy={-11} r={2.4} fill="#fff" />
                <text
                  y={13}
                  textAnchor="middle"
                  style={{ fontSize: '10px' }}
                  fill="#111111"
                  stroke="#fff"
                  strokeWidth={2.4}
                  paintOrder="stroke"
                >
                  {o.title}
                </text>
              </g>
            );
          })}

          {marker && (
            <g transform={`translate(${project(marker.lon, marker.lat).join(' ')}) scale(${k})`}>
              <circle r={18} className="fill-accent/25 animate-pulse" />
              <path
                d="M0 3 L-7 -9 A7.7 7.7 0 1 1 7 -9 Z"
                className="fill-accent stroke-white"
                strokeWidth={1.4}
              />
              <circle cy={-13} r={2.8} fill="#fff" />
            </g>
          )}
        </svg>

        {pickMode && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-sm bg-deep/90 px-4 py-2 text-[0.8em] uppercase tracking-[0.08em] text-deep-foreground">
              <Icon name="Hand" size={14} className="mr-1.5 inline text-accent" />
              Коснитесь карты, чтобы поставить объект
            </span>
          </div>
        )}

        {active && !pickMode && (
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-sm border border-black/20 bg-white/90 px-3 py-2 text-[0.8em] uppercase tracking-[0.08em] text-foreground">
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
          <div className="pointer-events-none absolute left-3 top-3 max-w-[280px] rounded-sm border border-accent/40 bg-white/95 p-3 shadow-lg">
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
                <div className="truncate text-[0.8em] text-muted-foreground">{hover.customer}</div>
              </div>
            </div>
            <div className="mt-2 text-[0.8em] text-muted-foreground">
              {hover.regionName} · {STATUS_LABEL[hover.status]} · готовность {hover.progress}%
            </div>
          </div>
        )}

        {shown.length === 0 && !pickMode && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-sm bg-white/90 px-4 py-2 text-[0.85em] uppercase tracking-[0.1em] text-foreground">
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
