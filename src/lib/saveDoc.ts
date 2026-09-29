/**
 * Сохранение Word-документов.
 *
 * На компьютере файл собирается прямо в браузере и сразу скачивается.
 * Внутри приложения на телефоне так нельзя: файл из памяти Android скачать
 * не может — кнопка нажимается, но ничего не происходит. Поэтому там
 * документ уходит на сервер и открывается обычной ссылкой.
 */
import { isAndroidApp } from '@/lib/platform';

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
  window.open(url, '_blank', 'noopener');
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
  if (!isAndroidApp() || !upload) {
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
