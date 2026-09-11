import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

interface SplashProps {
  onDone: () => void;
}

const CONSENT_KEY = 'gsi-privacy-consent-v1';

/** Минимальное время показа заставки, мс. */
const MIN_MS = 5000;

export const hasPrivacyConsent = () =>
  localStorage.getItem(CONSENT_KEY) === '1';

// Направления, из которых «собирается» земной шар.
const GLOBE_PARTS = [
  { clip: 'inset(0 50% 50% 0)', from: 'translate(-60px,-60px)' },
  { clip: 'inset(0 0 50% 50%)', from: 'translate(60px,-60px)' },
  { clip: 'inset(50% 50% 0 0)', from: 'translate(-60px,60px)' },
  { clip: 'inset(50% 0 0 50%)', from: 'translate(60px,60px)' },
];

const Splash = ({ onDone }: SplashProps) => {
  const [phase, setPhase] = useState<'anim' | 'consent'>('anim');
  const [leaving, setLeaving] = useState(false);
  const [checked, setChecked] = useState(false);

  // Падающие листья со случайными параметрами.
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: 0.5 + Math.random() * 2.4,
        dur: 1.8 + Math.random() * 1.4,
        size: 20 + Math.random() * 26,
        rot: Math.random() * 360,
        drift: (Math.random() - 0.5) * 80,
      })),
    [],
  );

  // Заставка держится на экране не меньше MIN_MS — иначе она «пролетает».
  useEffect(() => {
    if (hasPrivacyConsent()) {
      const t = window.setTimeout(leave, MIN_MS);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setPhase('consent'), MIN_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    try {
      const a = new Audio('/startup.mp3');
      a.volume = 0.45;
      a.play().catch(() => undefined);
    } catch {
      /* автовоспроизведение может быть недоступно — не критично */
    }
    window.setTimeout(onDone, 650);
  };

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, '1');
    leave();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-white"
      style={leaving ? { animation: 'gsi-leave 0.65s ease-in forwards' } : undefined}
    >
      <style>{`
        @keyframes gsi-leave {
          from { opacity: 1; transform: scale(1); filter: brightness(1); }
          40% { filter: brightness(0.6); }
          to { opacity: 0; transform: scale(1.06); filter: brightness(0.2); }
        }
        @keyframes gsi-assemble {
          from { opacity: 0; }
          60% { opacity: 1; }
          to { opacity: 1; transform: none; }
        }
        @keyframes gsi-leaf-fall {
          0% { opacity: 0; transform: translateY(-120px) rotate(0deg); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translateY(70vh) rotate(360deg); }
        }
        @keyframes gsi-leaf-stick {
          0% { opacity: 0; transform: translate(120px,-160px) rotate(-40deg) scale(1.4); }
          70% { opacity: 1; transform: translate(4px,6px) rotate(8deg) scale(1); }
          85% { transform: translate(0,0) rotate(-2deg) scale(1.02); }
          100% { opacity: 1; transform: translate(0,0) rotate(0) scale(1); }
        }
        @keyframes gsi-title {
          from { opacity: 0; transform: translateY(14px); letter-spacing: 0.5em; }
          to { opacity: 1; transform: none; letter-spacing: 0.12em; }
        }
        @keyframes gsi-line {
          from { width: 0; opacity: 0; }
          to { width: 90px; opacity: 1; }
        }
      `}</style>

      <div className="flex flex-col items-center px-6">
        <div className="relative h-44 w-44 sm:h-52 sm:w-52">
          {/* Земной шар собирается из четырёх сегментов */}
          {GLOBE_PARTS.map((p, i) => (
            <img
              key={i}
              src="/splash-globe.png"
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain"
              style={{
                clipPath: p.clip,
                animation: `gsi-assemble 1.1s ${0.2 + i * 0.26}s ease-out both`,
                transform: p.from,
              }}
            />
          ))}

          {/* Лист, прилипающий к шару */}
          <img
            src="/splash-leaf.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain"
            style={{ animation: 'gsi-leaf-stick 1.3s 2.4s ease-out both' }}
          />

          {/* Дождь листьев поверх шара */}
          {phase === 'anim' &&
            leaves.map((l) => (
              <img
                key={l.id}
                src="/leaf-fall.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute top-0"
                style={{
                  left: `${l.left}%`,
                  width: l.size,
                  height: l.size,
                  marginLeft: l.drift,
                  animation: `gsi-leaf-fall ${l.dur}s ${l.delay}s ease-in both`,
                  transform: `rotate(${l.rot}deg)`,
                }}
              />
            ))}
        </div>

        <h1
          className="mt-7 text-center font-head text-[26px] uppercase leading-tight text-foreground sm:text-[34px]"
          style={{ animation: 'gsi-title 1.1s 3.2s ease-out both' }}
        >
          Глобал-Стройинжиниринг
        </h1>
        <span
          className="mt-2 block h-[3px] rounded-full bg-accent"
          style={{ animation: 'gsi-line 0.9s 3.9s ease-out both' }}
        />
        <p
          className="mt-3 text-center text-[0.8em] uppercase tracking-[0.22em] text-muted-foreground"
          style={{ animation: 'gsi-title 1.1s 4.1s ease-out both' }}
        >
          Строительный контроль
        </p>

        {phase === 'consent' && (
          <div className="mt-8 w-full max-w-md animate-fade-in rounded-sm border border-border border-t-2 border-t-accent bg-card p-5 text-left">
            <h2 className="flex items-center gap-2 font-head text-[1.05em] uppercase tracking-[0.03em]">
              <Icon name="ShieldCheck" size={18} className="text-accent" />
              Конфиденциальность
            </h2>
            <p className="mt-2.5 text-[0.86em] leading-relaxed text-muted-foreground">
              Приложение обрабатывает персональные данные и данные о рабочих
              перемещениях сотрудников. Продолжая, вы принимаете условия
              конфиденциальности и даёте согласие на обработку персональных
              данных в соответствии с 152-ФЗ.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-[0.82em]">
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-accent underline-offset-2 hover:underline"
              >
                <Icon name="FileText" size={13} />
                Политика конфиденциальности
              </a>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-[hsl(var(--accent))]"
              />
              <span className="text-[0.84em] leading-snug text-foreground">
                Я принимаю условия конфиденциальности и даю согласие на обработку
                персональных данных.
              </span>
            </label>

            <Button
              onClick={accept}
              disabled={!checked}
              className="mt-4 w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="ArrowRight" size={16} />
              Принять и войти
            </Button>

          </div>
        )}
      </div>
    </div>
  );
};

export default Splash;