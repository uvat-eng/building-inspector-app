/**
 * Печать документов.
 *
 * В браузере печатает отдельная скрытая рамка: печать страницы или уже
 * показанной рамки на телефоне не открывает меню принтера — кнопка молчит.
 * Внутри приложения документ передаём ему, и меню печати показывает система.
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

/** Печать через отдельную рамку — обычный браузер. */
const printInFrame = (html: string) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.srcdoc = html;
  document.body.appendChild(frame);

  const run = () => {
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      return;
    }
    try {
      win.focus();
      win.print();
    } catch {
      // Печать недоступна — рамку убираем, экран не ломаем.
    }
    setTimeout(() => frame.remove(), 60000);
  };

  // Ждём загрузку картинок и шрифтов, иначе уйдёт пустой лист.
  frame.onload = () => setTimeout(run, 400);
  setTimeout(() => {
    if (frame.parentNode && !frame.dataset.done) {
      frame.dataset.done = '1';
      run();
    }
  }, 2500);
};

/** Печатает готовый документ способом, доступным на этом устройстве. */
export const printDoc = (html: string, title = 'Документ') => {
  if (printNative(html, title)) return;
  printInFrame(html);
};

export default printDoc;
