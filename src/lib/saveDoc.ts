/**
 * Сохранение и открытие документов.
 *
 * На компьютере файл просто скачивается. На телефоне так нельзя: файл из
 * памяти браузера ни iPhone, ни приложение на Android скачать не могут —
 * кнопка нажимается, но ничего не происходит. Поэтому телефону отдаём файл
 * через системное меню «Поделиться»: оттуда его сохраняют в «Файлы», открывают
 * в Word или сразу отправляют подрядчику.
 */
import { needsServerDoc } from '@/lib/platform';

const safeName = (name: string) => name.replace(/[/\\:*?"<>|]/g, '-');

/** Тип файла по расширению — по нему телефон выбирает, чем открыть документ. */
const MIME: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  pdf: 'application/pdf',
  html: 'text/html',
};

/** Обычное скачивание файла — компьютер и запасной путь для телефона. */
const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/**
 * Сохраняет любой файл: Word, Excel, PDF, таблицу.
 *
 * Возвращает true, если файл ушёл в меню «Поделиться» (только телефон).
 */
export const saveFile = async (data: BlobPart, fileName: string, mime?: string) => {
  const name = safeName(fileName);
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const type = mime ?? MIME[ext] ?? 'application/octet-stream';
  const blob = data instanceof Blob ? data : new Blob([data], { type });

  if (needsServerDoc()) {
    const nav = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean;
      share?: (d: { files?: File[]; title?: string }) => Promise<void>;
    };
    if (nav.share && nav.canShare) {
      const file = new File([blob], name, { type });
      if (nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: name });
          return true;
        } catch {
          // Меню закрыли или устройство не поддержало — скачиваем как обычно.
        }
      }
    }
  }

  downloadBlob(blob, name);
  return false;
};

/**
 * Открывает файл, уже лежащий на сервере, не уводя с текущего экрана.
 *
 * Телефону сначала предлагаем меню «Поделиться» — так документ можно сохранить
 * или открыть в Word. Отдельную вкладку не открываем: на iPhone она подменяет
 * собой всё приложение.
 */
export const openDocUrl = async (url: string, fileName?: string) => {
  if (needsServerDoc()) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const fromServer = res.headers.get('Content-Disposition') ?? '';
        const found = /filename\*=UTF-8''([^;]+)/.exec(fromServer);
        const name = fileName ?? (found ? decodeURIComponent(found[1]) : 'Документ.doc');
        await saveFile(blob, name, blob.type);
        return;
      }
    } catch {
      // Нет связи — пробуем открыть ссылку напрямую.
    }
  }

  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = url;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 60000);
};

/**
 * Сохраняет документ и, если задано, кладёт копию на сервер для реестра.
 *
 * Файл пользователю всегда отдаёт saveFile — из памяти браузера. Ссылку на
 * сервер телефону не подсовываем: Safari её игнорировал, и файл выходил пустым.
 */
export const saveDoc = async (
  html: string,
  name: string,
  upload?: (html: string) => Promise<string>,
) => {
  let url: string | undefined;

  if (upload) {
    // Копия на сервере нужна реестру. Нет связи — документ всё равно отдадим.
    try {
      url = await upload(html);
    } catch {
      url = undefined;
    }
  }

  const opened = await saveFile(`\ufeff${html}`, `${name}.doc`);
  return { opened, url };
};

export default saveDoc;
