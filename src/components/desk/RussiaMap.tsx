import { useMemo, useRef, useState } from "react";
import {
  DISTRICTS,
  CITIES,
  RUSSIA_PATH,
  MAP_W,
  MAP_H,
  project,
  unproject,
} from "@/data/geo";
import { ProjectObject, STATUS_LABEL } from "@/data/store";
import { cn } from "@/lib/utils";
import Icon from "@/components/ui/icon";

interface RussiaMapProps {
  objects: ProjectObject[];
  onPick?: (o: ProjectObject) => void;
  pickMode?: boolean;
  marker?: { lon: number; lat: number } | null;
  onPoint?: (lon: number, lat: number) => void;
  focusDistrict?: string | null;
  height?: string;
}

const PIN_TONE: Record<ProjectObject["status"], string> = {
  work: "fill-accent",
  plan: "fill-warning",
  done: "fill-success",
  risk: "fill-destructive",
};

const FULL: [number, number, number, number] = [0, 0, MAP_W, MAP_H];

const RussiaMap = ({
  objects,
  onPick,
  pickMode = false,
  marker = null,
  onPoint,
  focusDistrict = null,
  height = "max-h-[46vh]",
}: RussiaMapProps) => {
  const [district, setDistrict] = useState<string | null>(focusDistrict);
  const [full, setFull] = useState(false);
  const [hover, setHover] = useState<ProjectObject | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);

  const active = DISTRICTS.find((d) => d.id === district) ?? null;

  const base = useMemo<[number, number, number, number]>(() => {
    if (!active) return FULL;
    const [x0, y0, x1, y1] = active.box;
    const pad = Math.max((x1 - x0) * 0.04, 6);
    const w = x1 - x0 + pad * 2;
    const h = y1 - y0 + pad * 2;
    const ratio = full ? 16 / 9 : MAP_W / MAP_H;
    let vw = w;
    let vh = h;
    if (w / h < ratio) vw = h * ratio;
    else vh = w / ratio;
    return [x0 - pad - (vw - w) / 2, y0 - pad - (vh - h) / 2, vw, vh];
  }, [active, full]);

  const view = useMemo<[number, number, number, number]>(() => {
    const vw = base[2] / zoom;
    const vh = base[3] / zoom;
    const cx = base[0] + base[2] / 2 + pan.x;
    const cy = base[1] + base[3] / 2 + pan.y;
    return [cx - vw / 2, cy - vh / 2, vw, vh];
  }, [base, zoom, pan]);

  const k = view[2] / MAP_W;

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const step = (dir: number) =>
    setZoom((z) => Math.min(8, Math.max(1, z * (dir > 0 ? 1.5 : 1 / 1.5))));

  const onWheel = (e: React.WheelEvent) => {
    if (!district || pickMode) return;
    e.preventDefault();
    step(e.deltaY < 0 ? 1 : -1);
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (pickMode || !district) return;
    const p = "touches" in e ? e.touches[0] : e;
    drag.current = { x: p.clientX, y: p.clientY, px: pan.x, py: pan.y };
  };

  const moveDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drag.current || !svgRef.current) return;
    const p = "touches" in e ? e.touches[0] : e;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = view[2] / rect.width;
    const sy = view[3] / rect.height;
    setPan({
      x: drag.current.px - (p.clientX - drag.current.x) * sx,
      y: drag.current.py - (p.clientY - drag.current.y) * sy,
    });
  };

  const endDrag = () => {
    drag.current = null;
  };

  const shown = district
    ? objects.filter((o) => o.district === district)
    : objects;
  const cities = useMemo(() => {
    if (!district) return CITIES.filter((c) => c.p >= 700000);
    const limit = zoom >= 3 ? 0 : zoom >= 2 ? 3000 : 15000;
    return CITIES.filter((c) => c.d === district && c.p >= limit).sort(
      (a, b) => b.p - a.p,
    );
  }, [district, zoom]);

  const select = (id: string | null) => {
    setDistrict(id);
    reset();
    if (!pickMode) setFull(!!id);
  };

  const tap = (
    e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>,
  ) => {
    if (!pickMode || !onPoint || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const p = "touches" in e ? e.changedTouches[0] : e;
    const px = ((p.clientX - rect.left) / rect.width) * view[2] + view[0];
    const py = ((p.clientY - rect.top) / rect.height) * view[3] + view[1];
    const [lon, lat] = unproject(px, py);
    onPoint(lon, lat);
  };

  const body = (
    <div className={cn("flex min-h-0 flex-col", full && "h-full")}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => select(null)}
          className={cn(
            "rounded-sm px-2.5 py-1 text-[0.8em] uppercase tracking-[0.06em] transition-colors",
            district === null
              ? "bg-accent text-accent-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-border",
          )}
        >
          Вся Россия
        </button>
        {DISTRICTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => select(d.id === district ? null : d.id)}
            className={cn(
              "rounded-sm px-2.5 py-1 text-[0.8em] uppercase tracking-[0.06em] transition-colors",
              district === d.id
                ? "bg-accent text-accent-foreground"
                : d.accent
                  ? "bg-accent/15 text-accent hover:bg-accent/25"
                  : "bg-secondary text-secondary-foreground hover:bg-border",
            )}
          >
            {d.short}
          </button>
        ))}
        {full && (
          <button
            type="button"
            onClick={() => {
              setFull(false);
              setDistrict(null);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-sm bg-foreground px-3 py-1 text-[0.8em] uppercase tracking-[0.06em] text-background"
          >
            <Icon name="X" size={14} />
            Закрыть
          </button>
        )}
      </div>

      <div className={cn("relative bg-[#cfe0ea]", full && "min-h-0 flex-1")}>
        <svg
          ref={svgRef}
          viewBox={view.join(" ")}
          preserveAspectRatio="xMidYMid meet"
          onClick={tap}
          onTouchEnd={(e) => {
            endDrag();
            tap(e);
          }}
          onWheel={onWheel}
          onDoubleClick={(e) => {
            if (pickMode || !district || !svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const px =
              ((e.clientX - rect.left) / rect.width) * view[2] + view[0];
            const py =
              ((e.clientY - rect.top) / rect.height) * view[3] + view[1];
            setZoom((z) => Math.min(8, z * 1.8));
            setPan({
              x: px - (base[0] + base[2] / 2),
              y: py - (base[1] + base[3] / 2),
            });
          }}
          onMouseDown={startDrag}
          onMouseMove={moveDrag}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={startDrag}
          onTouchMove={moveDrag}
          className={cn(
            "block w-full select-none",
            full ? "h-full" : cn("h-auto", height),
            pickMode
              ? "cursor-crosshair touch-none"
              : district && "cursor-grab touch-none active:cursor-grabbing",
          )}
          role="img"
          aria-label="Карта объектов по России"
        >
          <defs>
            <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dcecc8" />
              <stop offset="100%" stopColor="#bed9a6" />
            </linearGradient>
            <pattern
              id="grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M24 0 H0 V24"
                fill="none"
                stroke="#7fa06a"
                strokeWidth="0.3"
                opacity="0.35"
              />
            </pattern>
            <clipPath id="land-clip">
              <path d={RUSSIA_PATH} fillRule="evenodd" />
            </clipPath>
          </defs>

          <path d={RUSSIA_PATH} fill="url(#land)" fillRule="evenodd" />
          <g clipPath="url(#land-clip)">
            <rect
              x={view[0]}
              y={view[1]}
              width={view[2]}
              height={view[3]}
              fill="url(#grid)"
            />
          </g>

          {DISTRICTS.map((d) => {
            const on = district === d.id;
            return (
              <path
                key={d.id}
                d={d.d}
                fillRule="evenodd"
                onClick={() => !pickMode && select(on ? null : d.id)}
                className={cn(
                  "transition-colors duration-300",
                  pickMode ? "pointer-events-none" : "cursor-pointer",
                  on
                    ? "fill-accent/25"
                    : d.accent
                      ? "fill-accent/10 hover:fill-accent/20"
                      : "fill-transparent hover:fill-[#8bb473]/30",
                )}
                stroke={on || d.accent ? "hsl(var(--accent))" : "#3f6b3a"}
                strokeOpacity={on || d.accent ? 1 : 0.75}
                strokeWidth={(on || d.accent ? 1.6 : 1) * k}
                strokeDasharray={`${7 * k} ${3 * k} ${2 * k} ${3 * k}`}
                strokeLinejoin="round"
              />
            );
          })}

          <path
            d={RUSSIA_PATH}
            fillRule="evenodd"
            className="pointer-events-none fill-none"
            stroke="#35502f"
            strokeWidth={1.4 * k}
            strokeLinejoin="round"
          />

          {!district &&
            DISTRICTS.map((d) => {
              const [x, y] = project(d.label[0], d.label[1]);
              return (
                <text
                  key={d.id}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  style={{ fontSize: `${11 * k}px` }}
                  className={cn(
                    "pointer-events-none uppercase tracking-[0.14em]",
                    d.accent ? "fill-accent" : "fill-[#3f6b3a]/80",
                  )}
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
                    fill="#2f4a2a"
                    fillOpacity={big ? 0.95 : 0.65}
                  />
                  <text
                    x={x + 4 * k}
                    y={y + 3.2 * k}
                    style={{ fontSize: `${(big ? 11 : 9) * k}px` }}
                    fill="#22381f"
                    fillOpacity={big ? 0.95 : 0.75}
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
                className={pickMode ? "pointer-events-none" : "cursor-pointer"}
                onMouseEnter={() => setHover(o)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPick?.(o)}
              >
                <circle
                  r={on ? 16 : 11}
                  className={cn(PIN_TONE[o.status], "opacity-25")}
                />
                <path
                  d="M0 2 L-6 -8 A6.6 6.6 0 1 1 6 -8 Z"
                  className={cn(PIN_TONE[o.status], "stroke-white")}
                  strokeWidth={1}
                />
                <circle cy={-11} r={2.4} fill="#fff" />
                <text
                  y={14}
                  textAnchor="middle"
                  style={{ fontSize: "11px" }}
                  fill="#111"
                  stroke="#fff"
                  strokeWidth={2.6}
                  paintOrder="stroke"
                >
                  {o.title}
                </text>
              </g>
            );
          })}

          {marker && (
            <g
              transform={`translate(${project(marker.lon, marker.lat).join(" ")}) scale(${k})`}
            >
              <circle r={18} className="animate-pulse fill-accent/25" />
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
            <span className="rounded-sm bg-foreground/90 px-4 py-2 text-[0.8em] uppercase tracking-[0.08em] text-background">
              <Icon
                name="Hand"
                size={14}
                className="mr-1.5 inline text-accent"
              />
              Коснитесь карты, чтобы поставить объект
            </span>
          </div>
        )}

        {active && !pickMode && (
          <>
            <div className="absolute right-3 top-3 flex items-center gap-2 rounded-sm border border-black/10 bg-white/90 px-3 py-2 text-[0.8em] uppercase tracking-[0.08em]">
              <Icon name="MapPin" size={14} className="text-accent" />
              {active.name} · {cities.length} нас. пунктов · объектов{" "}
              {shown.length}
            </div>
            <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-sm border border-black/20 bg-white/95">
              <button
                type="button"
                onClick={() => step(1)}
                className="flex h-9 w-9 items-center justify-center border-b border-black/15 transition-colors hover:bg-foreground hover:text-background"
                aria-label="Приблизить"
              >
                <Icon name="Plus" size={16} />
              </button>
              <button
                type="button"
                onClick={() => step(-1)}
                className="flex h-9 w-9 items-center justify-center border-b border-black/15 transition-colors hover:bg-foreground hover:text-background"
                aria-label="Отдалить"
              >
                <Icon name="Minus" size={16} />
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-foreground hover:text-background"
                aria-label="Сбросить масштаб"
              >
                <Icon name="Maximize" size={15} />
              </button>
              <span className="border-t border-black/15 px-1 py-1 text-center text-[0.65em] tracking-[0.04em]">
                {zoom.toFixed(1)}×
              </span>
            </div>
          </>
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
                <div className="truncate text-[0.8em] text-muted-foreground">
                  {hover.customer}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[0.8em] text-muted-foreground">
              {hover.regionName} · {STATUS_LABEL[hover.status]} · готовность{" "}
              {hover.progress}%
            </div>
          </div>
        )}

        {shown.length === 0 && !pickMode && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-sm bg-white/90 px-4 py-2 text-[0.85em] uppercase tracking-[0.1em]">
              Объектов в этой зоне нет
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-border bg-card px-4 py-2.5 text-[0.78em] uppercase tracking-[0.08em] text-muted-foreground">
        {(
          [
            ["work", "bg-accent"],
            ["plan", "bg-warning"],
            ["risk", "bg-destructive"],
            ["done", "bg-success"],
          ] as const
        ).map(([key, c]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", c)} />
            {STATUS_LABEL[key]}
          </span>
        ))}
        <span className="ml-auto hidden sm:inline">
          {district
            ? "Колесо или ± — масштаб, перетаскивание — сдвиг, двойной клик — приблизить"
            : "Нажмите округ, чтобы раскрыть его на весь экран"}
        </span>
      </div>
    </div>
  );

  if (full) {
    return (
      <>
        <div className="flex h-[46vh] items-center justify-center bg-secondary/40 text-[0.85em] uppercase tracking-[0.1em] text-muted-foreground">
          Карта открыта на весь экран
        </div>
        <div className="fixed inset-0 z-50 flex flex-col bg-background p-3 sm:p-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-border">
            {body}
          </div>
        </div>
      </>
    );
  }

  return body;
};

export default RussiaMap;
