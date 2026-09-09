import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { OnlineUser, TrackPoint, ruTime } from '@/data/tracker';

interface TrackerMapProps {
  online: OnlineUser[];
  track?: TrackPoint[];
  focusId?: string | null;
  className?: string;
}

type MapView = 'scheme' | 'satellite';

const dot = (color: string) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;
      background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color}55;"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const roleColor = (role: string) => (role === 'driver' ? '#2563eb' : '#e0501e');

const SCHEME_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SAT_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SAT_LABELS =
  'https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png';

const TrackerMap = ({ online, track, focusId, className }: TrackerMapProps) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const baseRef = useRef<L.TileLayer | null>(null);
  const labelRef = useRef<L.TileLayer | null>(null);
  const fitRef = useRef<() => void>(() => undefined);
  const [view, setView] = useState<MapView>('scheme');

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const map = L.map(boxRef.current, {
      center: [64, 76],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    baseRef.current = L.tileLayer(SCHEME_URL, { maxZoom: 19 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  // Переключение схема/спутник.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (baseRef.current) map.removeLayer(baseRef.current);
    if (labelRef.current) {
      map.removeLayer(labelRef.current);
      labelRef.current = null;
    }
    if (view === 'satellite') {
      baseRef.current = L.tileLayer(SAT_URL, { maxZoom: 19 }).addTo(map);
      labelRef.current = L.tileLayer(SAT_LABELS, { maxZoom: 18, opacity: 0.9 }).addTo(map);
    } else {
      baseRef.current = L.tileLayer(SCHEME_URL, { maxZoom: 19 }).addTo(map);
    }
    baseRef.current.bringToBack();
  }, [view]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (track && track.length) {
      const line = track.map((p) => [p.lat, p.lng]) as [number, number][];
      L.polyline(line, { color: '#e0501e', weight: 4, opacity: 0.9 }).addTo(layer);
      if (line.length) {
        L.marker(line[0], { icon: dot('#16a34a') })
          .addTo(layer)
          .bindPopup('Начало смены');
        L.marker(line[line.length - 1], { icon: dot('#dc2626') })
          .addTo(layer)
          .bindPopup('Последняя точка');
        const b = L.latLngBounds(line).pad(0.2);
        fitRef.current = () => map.fitBounds(b, { maxZoom: 16 });
        fitRef.current();
      }
      return;
    }

    const bounds: [number, number][] = [];
    online.forEach((u) => {
      const m = L.marker([u.lat, u.lng], { icon: dot(roleColor(u.role)) }).addTo(layer);
      m.bindPopup(
        `<b>${u.fio}</b><br>${u.role === 'driver' ? 'Водитель' : 'Инспектор'}<br>` +
          `в ${ruTime(u.at)} · ±${Math.round(u.accuracy)} м`,
      );
      if (focusId && u.userId === focusId) m.openPopup();
      bounds.push([u.lat, u.lng]);
    });
    if (focusId) {
      const f = online.find((u) => u.userId === focusId);
      if (f) {
        fitRef.current = () => map.setView([f.lat, f.lng], 14);
        fitRef.current();
      }
    } else if (bounds.length) {
      const b = L.latLngBounds(bounds).pad(0.3);
      fitRef.current = () => map.fitBounds(b, { maxZoom: 13 });
      fitRef.current();
    } else {
      fitRef.current = () => map.setView([64, 76], 4);
    }
  }, [online, track, focusId]);

  return (
    <div className="relative overflow-hidden rounded-sm">
      <div
        ref={boxRef}
        className={className}
        style={{ minHeight: 320, borderRadius: 4, zIndex: 0 }}
      />

      <div className="absolute left-2 top-2 z-[400] flex gap-1 rounded-sm border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
        {(
          [
            { k: 'scheme' as const, l: 'Схема', i: 'Map' },
            { k: 'satellite' as const, l: 'Спутник', i: 'Satellite' },
          ]
        ).map((v) => (
          <button
            key={v.k}
            type="button"
            onClick={() => setView(v.k)}
            className={cn(
              'flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[0.76em] font-head uppercase tracking-[0.05em] transition-colors',
              view === v.k
                ? 'bg-accent text-accent-foreground'
                : 'text-foreground hover:bg-secondary',
            )}
          >
            <Icon name={v.i} size={13} />
            {v.l}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => fitRef.current()}
        title="Показать всех в кадре"
        className="absolute bottom-2 right-2 z-[400] flex items-center gap-1.5 rounded-sm border border-border bg-card/95 px-2.5 py-1.5 text-[0.76em] uppercase tracking-[0.05em] shadow-sm backdrop-blur transition-colors hover:border-accent hover:text-accent"
      >
        <Icon name="Maximize2" size={13} />
        Вписать
      </button>
    </div>
  );
};

export default TrackerMap;
