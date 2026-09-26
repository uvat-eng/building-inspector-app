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
