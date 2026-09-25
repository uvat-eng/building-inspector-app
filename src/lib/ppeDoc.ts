import { PpeItem, SEASON_LABEL, Writeoff, fmt } from '@/data/outfit';
import { openDoc } from '@/data/docPreview';

const shell = (title: string, inner: string) => `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>${title}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 14pt; text-transform: uppercase; text-align: center; margin: 0 0 4mm; }
  .meta { font-size: 10pt; margin-bottom: 5mm; }
  .meta div { margin-bottom: 1.5mm; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { border: 1px solid #333; padding: 2mm 2.5mm; vertical-align: top; }
  th { background: #eee; text-align: left; font-weight: bold; }
  td.c, th.c { text-align: center; }
  .sign { margin-top: 10mm; font-size: 10pt; }
  .sign div { margin-bottom: 7mm; }
  .line { display: inline-block; border-bottom: 1px solid #333; min-width: 60mm; }
  p.note { font-size: 10pt; margin: 4mm 0; }
</style></head><body>${inner}</body></html>`;

export const buildSheetHtml = (
  items: PpeItem[],
  holderFio: string,
  org = 'ООО «Глобал-Стройинжиниринг»',
) => {
  const rows = items
    .map(
      (i, k) => `<tr>
      <td class="c">${k + 1}</td>
      <td>${i.title}</td>
      <td class="c">${SEASON_LABEL[i.season] ?? '—'}</td>
      <td class="c">${i.size || '—'}</td>
      <td class="c">${i.qty}</td>
      <td class="c">${fmt(i.issuedAt)}</td>
      <td class="c">${i.wearMonths} мес.</td>
      <td class="c">${fmt(i.expiresAt)}</td>
      <td class="c">${i.status === 'writeoff' ? 'списано' : i.status === 'pending' ? 'на списании' : 'в носке'}</td>
    </tr>`,
    )
    .join('');

  return shell(
    'Ведомость спецодежды',
    `<h1>Личная карточка учёта выдачи СИЗ</h1>
     <div class="meta">
       <div><b>Организация:</b> ${org}</div>
       <div><b>Работник:</b> ${holderFio || '—'}</div>
       <div><b>Дата формирования:</b> ${new Date().toLocaleDateString('ru')}</div>
     </div>
     <table>
       <thead><tr>
         <th class="c">№</th><th>Наименование СИЗ</th><th class="c">Сезон</th>
         <th class="c">Размер</th><th class="c">Кол-во</th><th class="c">Выдано</th>
         <th class="c">Срок носки</th><th class="c">До</th><th class="c">Состояние</th>
       </tr></thead>
       <tbody>${rows || '<tr><td colspan="9" class="c">позиций нет</td></tr>'}</tbody>
     </table>
     <div class="sign">
       <div>Выдал: <span class="line"></span> / <span class="line"></span></div>
       <div>Получил: <span class="line"></span> / ${holderFio || ''}</div>
     </div>`,
  );
};

export const buildWriteoffActHtml = (
  w: Writeoff,
  org = 'ООО «Глобал-Стройинжиниринг»',
) => {
  const rows = (w.items ?? [])
    .map(
      (i, k) => `<tr>
      <td class="c">${k + 1}</td>
      <td>${i.title}</td>
      <td class="c">${i.size || '—'}</td>
      <td class="c">${i.qty}</td>
      <td class="c">${fmt(i.issuedAt)}</td>
    </tr>`,
    )
    .join('');

  const photos = (w.photos ?? []).length
    ? `<p class="note"><b>Фотофиксация:</b></p>${(w.photos ?? [])
        .map((p) => `<img src="${p}" style="max-width:60mm;margin:0 3mm 3mm 0" />`)
        .join('')}`
    : '';

  return shell(
    'Акт списания спецодежды',
    `<h1>Акт списания спецодежды № ${w.actNo || '—'}</h1>
     <div class="meta">
       <div><b>Организация:</b> ${org}</div>
       <div><b>Материально ответственное лицо:</b> ${w.holderFio || '—'}</div>
       <div><b>Дата:</b> ${fmt(w.managerAt || w.createdAt)}</div>
     </div>
     <table>
       <thead><tr>
         <th class="c">№</th><th>Наименование</th><th class="c">Размер</th>
         <th class="c">Кол-во</th><th class="c">Дата выдачи</th>
       </tr></thead>
       <tbody>${rows}</tbody>
     </table>
     <p class="note"><b>Причина списания:</b> ${w.reason || '—'}</p>
     ${photos}
     <div class="sign">
       <div>Сдал (инспектор СК): <span class="line"></span> / ${w.holderFio}</div>
       <div>Согласовано (старший инженер): <span class="line"></span> / ${w.engineerFio || ''}</div>
       <div>Утверждено (руководитель проекта): <span class="line"></span> / ${w.managerFio || ''}</div>
     </div>`,
  );
};

export const printHtml = (html: string, title = 'Документ') => {
  openDoc(html, title);
  return true;
};