import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OnlineUser, TrackPoint, ruTime } from '@/data/tracker';

interface TrackerMapProps {
  online: OnlineUser[];
  track?: TrackPoint[];
  focusId?: string | null;
  className?: string;
}

const dot = (color: string) =>
  L.divIcon({
    className: '',
    html: `<span style="display:block;width:16px;height:16px;border-radius:50%;
      background:${color};border:2px solid #fff;box-shadow:0 0 0 2px ${color}55;"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const roleColor = (role: string) => (role === 'driver' ? '#2563eb' : '#e0501e');

const TrackerMap = ({ online, track, focusId, className }: TrackerMapProps) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!boxRef.current || mapRef.current) return;
    const map = L.map(boxRef.current, {
      center: [64, 76],
      zoom: 4,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (track && track.length) {
      const line = track.map((p) => [p.lat, p.lng]) as [number, number][];
      L.polyline(line, { color: '#e0501e', weight: 3, opacity: 0.8 }).addTo(layer);
      if (line.length) {
        L.marker(line[0], { icon: dot('#16a34a') })
          .addTo(layer)
          .bindPopup('Начало смены');
        L.marker(line[line.length - 1], { icon: dot('#dc2626') })
          .addTo(layer)
          .bindPopup('Последняя точка');
        map.fitBounds(L.latLngBounds(line).pad(0.2));
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
      if (f) map.setView([f.lat, f.lng], 13);
    } else if (bounds.length) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.3), { maxZoom: 12 });
    }
  }, [online, track, focusId]);

  return (
    <div
      ref={boxRef}
      className={className}
      style={{ minHeight: 320, borderRadius: 4, zIndex: 0 }}
    />
  );
};

export default TrackerMap;
