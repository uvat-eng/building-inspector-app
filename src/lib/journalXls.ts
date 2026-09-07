import {
  JournalEntry,
  JOURNAL_CATEGORIES,
  groupByObject,
  isFixed,
  journalStat,
} from '@/data/journal';

const esc = (s?: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

const CSS = `
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
  td, th { border: 1px solid #999; padding: 3pt 5pt; vertical-align: top; }
  th { background: #dbe5f1; font-weight: bold; text-align: center; }
  .c { text-align: center; }
  h2 { font-family: Calibri, Arial, sans-serif; font-size: 12pt; margin: 8pt 0 4pt; }
  h3 { font-family: Calibri, Arial, sans-serif; font-size: 11pt; margin: 6pt 0 3pt; }
`;

const sheetName = (s: string, i: number) =>
  (s || `Объект${i + 1}`).replace(/[\\/*?[\]:]/g, ' ').slice(0, 28) || `Объект${i + 1}`;

const sheetHtml = (title: string, inspector: string, project: string, list: JournalEntry[]) => {
  const s = journalStat(list);
  const contractor = list[0]?.contractor ?? '';

  return `<h2>Индивидуальный журнал замечаний ИСК ООО «Глобал-Стройинжиниринг» —
    ${esc(inspector)} на ${ruDate(new Date().toISOString())}</h2>
  <table>
    <tr>
      <th rowspan="2">Подрядная организация</th>
      <th rowspan="2">Объект строительства</th>
      <th colspan="2">Выдано замечаний</th>
      <th colspan="2">Устранено замечаний</th>
      <th colspan="2">Не устранено замечаний</th>
    </tr>
    <tr>
      <th>ответственность подрядчика</th><th>ответственность заказчика</th>
      <th>ответственность подрядчика</th><th>ответственность заказчика</th>
      <th>ответственность подрядчика</th><th>ответственность заказчика</th>
    </tr>
    <tr>
      <td>${esc(contractor)}</td>
      <td>${esc(project)}</td>
      <td class="c">${s.issuedContractor}</td><td class="c">${s.issuedCustomer}</td>
      <td class="c">${s.fixedContractor}</td><td class="c">${s.fixedCustomer}</td>
      <td class="c">${s.openContractor}</td><td class="c">${s.openCustomer}</td>
    </tr>
  </table>

  <h3>${esc(title)}</h3>
  <table>
    <tr>
      <th rowspan="2">№ п/п</th><th rowspan="2">Дата</th><th rowspan="2">Организация</th>
      <th rowspan="2">Объект</th>
      <th rowspan="2">Содержание замечания и предложения<br/>(выявленные отступления)</th>
      <th rowspan="2">Запись произвел<br/>(должность, организация, Ф.И.О.)</th>
      <th rowspan="2">С записью ознакомился</th><th rowspan="2">Выполненные мероприятия</th>
      <th colspan="2">Отчет об устранении</th>
      <th colspan="2">Ответственность</th>
      <th rowspan="2">Выдано предписание / комментарии</th>
      <th rowspan="2">Характер замечания</th>
      <th colspan="${JOURNAL_CATEGORIES.length}">Характер нарушений</th>
    </tr>
    <tr>
      <th>статус</th><th>дата устранения</th>
      <th>подрядчик</th><th>заказчик</th>
      ${JOURNAL_CATEGORIES.map((c) => `<th>${esc(c)}</th>`).join('')}
    </tr>
    ${list
      .map(
        (e, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td class="c">${ruDate(e.date)}</td>
      <td>${esc(e.contractor)}</td>
      <td>${esc(e.objectTitle)}</td>
      <td>${esc(e.content)}</td>
      <td>${esc(e.recordedBy)}</td>
      <td>${esc(e.ackBy)}</td>
      <td>${esc(e.measures)}</td>
      <td class="c">${esc(e.fixStatus)}</td>
      <td class="c">${ruDate(e.fixDate)}</td>
      <td class="c">${e.responsibility === 'вопрос подрядчика' ? 'вопрос подрядчика' : ''}</td>
      <td class="c">${e.responsibility === 'вопрос заказчика' ? 'вопрос заказчика' : ''}</td>
      <td>${esc(e.orderNote)}</td>
      <td>${esc(e.category)}</td>
      ${JOURNAL_CATEGORIES.map(
        (c) => `<td class="c">${e.category === c ? 1 : ''}</td>`,
      ).join('')}
    </tr>`,
      )
      .join('')}
  </table>`;
};

const summaryHtml = (inspector: string, all: JournalEntry[]) => {
  const groups = groupByObject(all);
  return `<h2>Ведомость · ${esc(inspector)}</h2>
  <table>
    <tr>
      <th>Объект</th><th>Всего замечаний</th><th>Устранено</th><th>Не устранено</th>
      ${JOURNAL_CATEGORIES.map((c) => `<th>${esc(c)}</th>`).join('')}
    </tr>
    ${groups
      .map(
        (g) => `<tr>
      <td>${esc(g.title)}</td>
      <td class="c">${g.items.length}</td>
      <td class="c">${g.items.filter((e) => isFixed(e.fixStatus)).length}</td>
      <td class="c">${g.items.filter((e) => !isFixed(e.fixStatus)).length}</td>
      ${JOURNAL_CATEGORIES.map(
        (c) => `<td class="c">${g.items.filter((e) => e.category === c).length}</td>`,
      ).join('')}
    </tr>`,
      )
      .join('')}
    <tr>
      <td><b>Итого</b></td>
      <td class="c"><b>${all.length}</b></td>
      <td class="c"><b>${all.filter((e) => isFixed(e.fixStatus)).length}</b></td>
      <td class="c"><b>${all.filter((e) => !isFixed(e.fixStatus)).length}</b></td>
      ${JOURNAL_CATEGORIES.map(
        (c) => `<td class="c"><b>${all.filter((e) => e.category === c).length}</b></td>`,
      ).join('')}
    </tr>
  </table>`;
};

export const buildJournalHtml = (
  entries: JournalEntry[],
  inspector: string,
  project = 'Обустройство Восточно-Мессояхского месторождения',
) => {
  const groups = groupByObject(entries);
  const sheets = [
    ...groups.map((g, i) => ({
      name: sheetName(g.title, i),
      html: sheetHtml(g.title, inspector, project, g.items),
    })),
    { name: 'Ведомость', html: summaryHtml(inspector, entries) },
  ];

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
${sheets
  .map(
    (s) =>
      `<x:ExcelWorksheet><x:Name>${esc(s.name)}</x:Name>` +
      '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>',
  )
  .join('')}
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>${CSS}</style></head>
<body>${sheets
    .map((s) => s.html)
    .join('<br style="page-break-before:always"/>')}</body></html>`;
};

export const journalFileName = (inspector: string) =>
  `Индивидуальный журнал ИСК ${inspector || ''}`.trim();

export const downloadJournal = (entries: JournalEntry[], inspector: string, project?: string) => {
  const html = buildJournalHtml(entries, inspector, project);
  const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${journalFileName(inspector).replace(/[/\\:*?"<>|]/g, '-')}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
