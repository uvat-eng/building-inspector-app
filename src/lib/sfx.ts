/**
 * Восьмибитные звуки интерфейса в духе приставочных игр.
 * Синтезируются на лету через Web Audio API — файлы не нужны.
 */

export type SfxName = 'success' | 'error' | 'delete' | 'download' | 'complete';

const STORAGE_KEY = 'sfx-enabled';

let ctx: AudioContext | null = null;
let lastAt = 0;

export const isSfxEnabled = () => localStorage.getItem(STORAGE_KEY) !== '0';

export const setSfxEnabled = (on: boolean) => {
  localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
};

const audio = () => {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

/** Полутон от ноты ля первой октавы. */
const note = (semitone: number) => 440 * 2 ** (semitone / 12);

interface Step {
  /** Полутон или прямая частота в герцах. */
  n: number;
  /** Начало от старта мелодии, секунды. */
  at: number;
  /** Длительность, секунды. */
  dur: number;
  /** Громкость 0..1. */
  gain?: number;
  /** Форма волны: квадрат — мелодия, треугольник — бас, шум-подобное — удар. */
  wave?: OscillatorType;
  /** Плавный уход частоты вниз или вверх к этому полутону. */
  slideTo?: number;
}

const MELODIES: Record<SfxName, Step[]> = {
  // Успех: бодрое восходящее арпеджио — три ступеньки вверх.
  success: [
    { n: 4, at: 0, dur: 0.07 },
    { n: 11, at: 0.07, dur: 0.07 },
    { n: 16, at: 0.14, dur: 0.16, gain: 0.3 },
  ],

  // Ошибка: две низкие ноты вниз — приставочное «не вышло».
  error: [
    { n: -5, at: 0, dur: 0.11, wave: 'square', gain: 0.26 },
    { n: -11, at: 0.11, dur: 0.22, wave: 'square', gain: 0.26 },
  ],

  // Удаление: короткий скользящий вниз свист — предмет исчез.
  delete: [{ n: 12, at: 0, dur: 0.18, slideTo: -12, wave: 'triangle', gain: 0.24 }],

  // Выгрузка: две ноты вверх, будто монетка — документ готов.
  download: [
    { n: 16, at: 0, dur: 0.06, gain: 0.22 },
    { n: 23, at: 0.06, dur: 0.2, gain: 0.24 },
  ],

  // Проверка завершена: короткая победная фраза из пяти нот.
  complete: [
    { n: 4, at: 0, dur: 0.08 },
    { n: 9, at: 0.08, dur: 0.08 },
    { n: 16, at: 0.16, dur: 0.08 },
    { n: 21, at: 0.24, dur: 0.08 },
    { n: 28, at: 0.32, dur: 0.26, gain: 0.3 },
    { n: -20, at: 0, dur: 0.12, wave: 'triangle', gain: 0.18 },
    { n: -20, at: 0.24, dur: 0.16, wave: 'triangle', gain: 0.18 },
  ],
};

const playStep = (ac: AudioContext, s: Step, start: number) => {
  const osc = ac.createOscillator();
  const amp = ac.createGain();

  osc.type = s.wave ?? 'square';
  const f0 = note(s.n);
  osc.frequency.setValueAtTime(f0, start);
  if (s.slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(note(s.slideTo), start + s.dur);
  }

  // Резкая атака и быстрый спад — характер старых звуковых чипов.
  const peak = s.gain ?? 0.26;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(peak, start + 0.006);
  amp.gain.setValueAtTime(peak, start + s.dur * 0.55);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + s.dur);

  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + s.dur + 0.02);
};

/** Подбирает звук по заголовку уведомления и его типу. */
export const sfxForToast = (title: string, variant?: string | null): SfxName => {
  const t = title.toLowerCase();
  if (variant === 'destructive') return 'error';
  if (/удал|очищ|отмен/.test(t)) return 'delete';
  if (/проверка заверш|проверено|анализ заверш/.test(t)) return 'complete';
  if (/выгру|скача|word|excel|отчёт готов|документ готов|экспорт/.test(t)) return 'download';
  return 'success';
};

/** Проигрывает короткий звук интерфейса. Молча ничего не делает, если звук выключен. */
export const playSfx = (name: SfxName) => {
  if (!isSfxEnabled()) return;

  // Защита от залпа: одинаковые события подряд не должны наслаиваться.
  const now = Date.now();
  if (now - lastAt < 120) return;
  lastAt = now;

  try {
    const ac = audio();
    if (!ac) return;
    const start = ac.currentTime + 0.01;
    MELODIES[name].forEach((s) => playStep(ac, s, start + s.at));
  } catch {
    /* звук не критичен — работу интерфейса не прерываем */
  }
};