/**
 * Определение платформы.
 *
 * App Store отклоняет приложения, где упоминаются другие мобильные платформы
 * или предлагается скачать установочный файл со стороны. Поэтому на технике
 * Apple такие блоки не показываем вовсе.
 */

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent);

/** iPhone, iPad или iPod. iPad на свежих iOS представляется как Mac с тач-экраном. */
export const isApple = () => {
  const s = ua();
  if (/iPhone|iPad|iPod/i.test(s)) return true;
  return /Macintosh/i.test(s) && typeof document !== 'undefined' && 'ontouchend' in document;
};

/** Приложение открыто как установленное, а не во вкладке браузера. */
export const isInstalled = () => {
  if (typeof window === 'undefined') return false;
  const standalone = (window.navigator as { standalone?: boolean }).standalone;
  return standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
};

/** Можно ли предлагать установочный файл: не на технике Apple и не внутри приложения. */
export const canOfferInstall = () => !isApple() && !isInstalled();

/** Приложение открыто внутри Android-обёртки (WebView). */
export const isAndroidApp = () => /Android/i.test(ua()) && /; wv\)/.test(ua());

/**
 * Нужно ли сохранять документ на сервер и открывать ссылкой.
 *
 * Телефон не умеет скачивать файл, собранный в памяти браузера: кнопка
 * нажимается, но ничего не происходит. На iPhone и iPad так ведёт себя любой
 * браузер, на Android — приложение-обёртка. В таких случаях кладём файл на
 * сервер и открываем обычной ссылкой.
 */
export const needsServerDoc = () => {
  if (isApple()) return true;
  if (isAndroidApp()) return true;
  return /Android|Mobile/i.test(ua());
};