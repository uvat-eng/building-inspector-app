import { FolderMeta, FolderPhoto } from '@/data/folders';
import { openDoc } from '@/data/docPreview';

export interface PhotoReportData {
  meta: FolderMeta;
  photos: FolderPhoto[];
}

const esc = (s = '') =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export const ruLongDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`;
};

export const buildPhotoReportHtml = ({ meta, photos }: PhotoReportData) => {
  const projectLines = (meta.project || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (meta.place) projectLines.push(meta.place);

  const period =
    meta.periodFrom && meta.periodTo
      ? `Отчет за период с ${ruLongDate(meta.periodFrom)} по ${ruLongDate(meta.periodTo)} года`
      : meta.date
        ? `Отчет за ${meta.date}`
        : '';

  const pairs: FolderPhoto[][] = [];
  for (let i = 0; i < photos.length; i += 2) pairs.push(photos.slice(i, i + 2));

  const pages = pairs
    .map(
      (pair, idx) => `
    <table class="grid brk${idx === 0 ? ' first' : ''}">
      <tr>
        ${pair.map((p) => `<td class="ph"><img src="${p.url}" /></td>`).join('')}
        ${pair.length === 1 ? '<td class="ph"></td>' : ''}
      </tr>
      <tr>
        ${pair.map((p) => `<td class="cap">${esc(p.caption || '')}</td>`).join('')}
        ${pair.length === 1 ? '<td class="cap"></td>' : ''}
      </tr>
    </table>`,
    )
    .join('');

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Фотоотчёт</title>
<style>
  @page { size: A4 landscape; margin: 1.2cm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }
  .title { border: 1px solid #000; padding: 14mm 8mm; text-align: center; }
  .title h1 { font-size: 20pt; font-weight: bold; margin: 0 0 12mm; text-transform: uppercase; }
  .title p { margin: 2mm 0; font-size: 14pt; }
  .title .obj { font-weight: bold; }
  .title .gap { height: 18mm; }
  table.grid { border-collapse: collapse; width: 100%; table-layout: fixed; }
  table.grid td { border: 1px solid #000; padding: 3mm; vertical-align: middle; text-align: center; }
  .ph { height: 96mm; }
  .ph img { max-width: 100%; max-height: 92mm; }
  .cap { font-size: 12pt; height: 14mm; }
  .brk { page-break-before: always; }
</style></head>
<body>
  <div class="title">
    <h1>Фотоотчет строительства объекта</h1>
    ${projectLines
      .map((l, i) => `<p class="obj">${i === 0 ? 'Объект: ' : ''}${esc(l)}</p>`)
      .join('')}
    <div class="gap"></div>
    <p>Подрядчик: ${esc(meta.contractor || '—')}</p>
    <p>${esc(period)}</p>
  </div>

  ${pages || '<p style="margin-top:8mm">Снимков нет.</p>'}
</body></html>`;
};

export const downloadPhotoReport = (data: PhotoReportData, name = 'Фотоотчёт') => {
  const blob = new Blob(['\ufeff', buildPhotoReportHtml(data)], {
    type: 'application/msword;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name.replace(/[/\\:*?"<>|]/g, '-')}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
};

export const printPhotoReport = (data: PhotoReportData, title = 'Фотоотчёт') => {
  openDoc(buildPhotoReportHtml(data), title);
  return true;
};