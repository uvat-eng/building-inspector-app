/**
 * Сохранение Word-документов.
 *
 * На компьютере файл собирается прямо в браузере и сразу скачивается.
 * На телефоне так нельзя: файл из памяти браузера ни iPhone, ни приложение
 * на Android скачать не могут — кнопка нажимается, но ничего не происходит.
 * Поэтому там документ уходит на сервер и забирается по ссылке.
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

/**
 * Открывает готовый файл, не уводя пользователя с текущего экрана.
 *
 * Запрос уходит из скрытой рамки: телефон подхватывает файл и сам предлагает
 * сохранить или открыть его, а рабочий экран остаётся на месте. Отдельную
 * вкладку не открываем — на iPhone она подменяет собой всё приложение.
 */
export const openDocUrl = (url: string) => {
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = url;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 60000);
};

/**
 * Сохраняет документ понятным для текущего устройства способом.
 *
 * upload — как положить файл на сервер; вызывается только на телефоне.
 * Если сервер недоступен, файл всё равно скачается из памяти.
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
  try {
    const url = await upload(html);
    openDocUrl(url);
    return { opened: true, url };
  } catch {
    saveLocally(html, name);
    return { opened: false };
  }
};

export default saveDoc;
