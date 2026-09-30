/**
 * Печать документов.
 *
 * Печатаем содержимое прямо на текущей странице: на время печати прячем
 * интерфейс и показываем только документ. Отдельная рамка или новое окно
 * на телефоне не работают — Safari печать в них не запускает, и кнопка
 * просто молчит. Внутри приложения документ отдаём ему: меню принтера
 * показывает сама система.
 */

type PrintBridge = { postMessage: (v: unknown) => void };

type BridgeWindow = Window & {
  webkit?: { messageHandlers?: { docPrint?: PrintBridge } };
  AndroidPrint?: { print: (html: string, title: string) => void };
};

/** Приложение умеет печатать само. */
export const hasNativePrint = () => {
  if (typeof window === 'undefined') return false;
  const w = window as BridgeWindow;
  return Boolean(w.webkit?.messageHandlers?.docPrint || w.AndroidPrint);
};

/** Печать средствами приложения: открывает системное меню принтера. */
const printNative = (html: string, title: string) => {
  const w = window as BridgeWindow;
  try {
    if (w.webkit?.messageHandlers?.docPrint) {
      w.webkit.messageHandlers.docPrint.postMessage({ html, title });
      return true;
    }
    if (w.AndroidPrint) {
      w.AndroidPrint.print(html, title);
      return true;
    }
  } catch {
    // Канал недоступен — печатаем обычным способом.
  }
  return false;
};

const ROOT_ID = 'gsi-print-root';
const STYLE_ID = 'gsi-print-style';

/** Разбирает готовый документ на стили и содержимое. */
const parseDoc = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const css = Array.from(doc.querySelectorAll('style'))
    .map((s) => s.textContent ?? '')
    .join('\n');
  return { css, body: doc.body?.innerHTML ?? html };
};

/** Убирает временные узлы после печати. */
const cleanup = () => {
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
  document.documentElement.classList.remove('gsi-printing');
};

/**
 * Печать содержимым текущей страницы.
 *
 * На время печати прячем интерфейс и показываем только документ — это
 * единственный способ, который работает и в Safari на iPhone.
 */
const printInPage = (html: string, title: string) => {
  cleanup();
  const { css, body } = parseDoc(html);

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent =
    `#${ROOT_ID}{display:none}` +
    '@media print{' +
    `html.gsi-printing body>*:not(#${ROOT_ID}){display:none!important}` +
    `#${ROOT_ID}{display:block!important;position:static!important;` +
    'width:100%!important;max-width:none!important;background:#fff!important;' +
    'color:#000!important}' +
    css +
    '}';
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.innerHTML = body;
  document.body.appendChild(root);
  document.documentElement.classList.add('gsi-printing');

  const prevTitle = document.title;
  document.title = title;

  const after = () => {
    document.title = prevTitle;
    cleanup();
    window.removeEventListener('afterprint', after);
  };
  window.addEventListener('afterprint', after);

  // Даём странице перерисоваться, иначе уйдёт пустой лист.
  window.setTimeout(() => {
    window.print();
    window.setTimeout(after, 1500);
  }, 150);
};

/** Печатает готовый документ способом, доступным на этом устройстве. */
export const printDoc = (html: string, title = 'Документ') => {
  if (printNative(html, title)) return;
  printInPage(html, title);
};

export default printDoc;