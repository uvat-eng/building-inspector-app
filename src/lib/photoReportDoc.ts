import { FolderMeta, FolderPhoto } from '@/data/folders';

export interface PhotoReportData {
  meta: FolderMeta;
  photos: FolderPhoto[];
}

const esc = (s = '') =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const buildPhotoReportHtml = ({ meta, photos }: PhotoReportData) => {
  const head = [meta.contractor, meta.project, meta.place]
    .filter(Boolean)
    .map((l) => `<div>${esc(l)}</div>`)
    .join('');

  const pairs: FolderPhoto[][] = [];
  for (let i = 0; i < photos.length; i += 2) pairs.push(photos.slice(i, i + 2));

  const rows = pairs
    .map(
      (pair) => `
      <tr>${pair
        .map(
          (p) => `<td class="ph"><img src="${p.url}" /></td>`,
        )
        .join('')}${pair.length === 1 ? '<td class="ph"></td>' : ''}</tr>
      <tr>${pair
        .map((p) => `<td class="cap">${esc(p.caption || '')}</td>`)
        .join('')}${pair.length === 1 ? '<td class="cap"></td>' : ''}</tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Фотоотчёт</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td, th { border: 1px solid #000; padding: 2mm; vertical-align: middle; text-align: center; }
  .head { font-weight: bold; font-size: 10.5pt; line-height: 1.35; }
  .ph { height: 62mm; }
  .ph img { max-width: 100%; max-height: 60mm; object-fit: contain; }
  .cap { font-size: 9.5pt; height: 12mm; }
  .sign td { border: 1px solid #000; padding: 3mm 2mm; font-size: 10pt; }
  .sign .r { text-align: right; line-height: 1.4; }
  .gap { height: 4mm; border: 0; }
</style></head><body>
  <table>
    <tr><td colspan="2" class="head">${head || '&nbsp;'}</td></tr>
    ${rows || '<tr><td colspan="2">снимков нет</td></tr>'}
  </table>
  <div class="gap"></div>
  <table class="sign">
    <tr>
      <td style="width:22%">${esc(meta.date || '')}</td>
      <td style="width:38%"></td>
      <td class="r" style="width:40%">
        ${esc(meta.managerFio ? 'Руководитель проекта' : 'Инспектор строительного контроля')}<br/>
        ${esc(meta.managerFio || meta.inspector || '')}<br/>
        ${esc(meta.managerPhone ? `Тел: ${meta.managerPhone}` : '')}
      </td>
    </tr>
  </table>
</body></html>`;
};

export const downloadPhotoReport = (data: PhotoReportData, name = 'Фотоотчёт') => {
  const blob = new Blob(['\ufeff', buildPhotoReportHtml(data)], {
    type: 'application/msword;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
};

export const printPhotoReport = (data: PhotoReportData) => {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(buildPhotoReportHtml(data));
  w.document.close();
  setTimeout(() => w.print(), 500);
  return true;
};
