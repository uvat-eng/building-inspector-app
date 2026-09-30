/**
 * Сохранение Word-документов.
 *
 * На компьютере файл собирается прямо в браузере и сразу скачивается.
 * На телефоне так нельзя: файл из памяти браузера ни iPhone, ни приложение
 * на Android скачать не могут — кнопка нажимается, но ничего не происходит.
 * Поэтому там документ уходит на сервер и открывается обычной ссылкой.
 */
import { needsServerDoc } from '@/lib/platform';

const safeName = (name: string) => name.replace(/[/\\:*?"<>|]/g, '-');

/** Скачивание файла из памяти браузера — только для компьютера. */
const saveLocally = (html: string, name: string) => {
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName(name)}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

/** Открытие уже сохранённого на сервере файла. */
export const openDocUrl = (url: string) => {
  const w = window.open(url, '_blank', 'noopener');
  // Safari на iPhone блокирует новое окно — тогда открываем на текущем экране.
  if (!w) window.location.href = url;
};

const WAIT_PAGE =
  '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,' +
  'initial-scale=1"><title>Готовим документ</title></head><body style="margin:0;' +
  'font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;' +
  'justify-content:center;height:100vh;color:#555">Готовим документ…</body></html>';

/**
 * Открывает пустую вкладку с надписью «Готовим документ…».
 *
 * Нужно для iPhone: Safari разрешает открыть вкладку только сразу по нажатию,
 * а пока файл уходит на сервер, это право теряется.
 */
export const openBlankTab = () => {
  const tab = window.open('', '_blank');
  tab?.document?.write(WAIT_PAGE);
  return tab;
};

/** Показывает готовый файл в заранее открытой вкладке. */
export const showInTab = (tab: Window | null, url: string) => {
  if (tab && !tab.closed) tab.location.href = url;
  else openDocUrl(url);
};

/**
 * Сохраняет документ понятным для текущего устройства способом.
 *
 * upload — как положить файл на сервер; вызывается только на телефоне.
 * Если сервер недоступен, файл всё равно скачается из памяти.
 *
 * Тонкость iPhone: Safari разрешает открыть вкладку только сразу по нажатию.
 * Пока файл уходит на сервер, это право теряется, поэтому пустую вкладку
 * открываем заранее и подставляем в неё ссылку, когда файл готов.
 */
export const saveDoc = async (
  html: string,
  name: string,
  upload?: (html: string) => Promise<string>,
) => {
  if (!needsServerDoc() || !upload) {
    saveLocally(html, name);
    return { opened: false };
  }

  const tab = openBlankTab();
  try {
    const url = await upload(html);
    showInTab(tab, url);
    return { opened: true, url };
  } catch {
    tab?.close();
    saveLocally(html, name);
    return { opened: false };
  }
};

export default saveDoc;