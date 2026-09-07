import { PersonMonth } from '@/components/desk/chief/TeamTimesheet';
import { MONTHS, fmtHours } from '@/data/timesheet';
import { ROLE_LABEL } from '@/data/profile';

const esc = (s?: string | number) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const CSS = `
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 9pt; }
  td, th { border: 1px solid #999; padding: 2pt 3pt; vertical-align: middle; }
  th { background: #dbe5f1; font-weight: bold; text-align: center; }
  .c { text-align: center; }
  .t { background: #f2f2f2; font-weight: bold; }
  h2 { font-family: Calibri, Arial, sans-serif; font-size: 12pt; margin: 8pt 0 4pt; }
  p { font-family: Calibri, Arial, sans-serif; font-size: 10pt; margin: 2pt 0; }
`;

export interface SheetOpts {
  year: number;
  month: number;
  daysInMonth: number;
  title: string;
  chief: string;
  project: string;
}

export const buildTeamSheetHtml = (rows: PersonMonth[], o: SheetOpts) => {
  const days = Array.from({ length: o.daysInMonth }, (_, i) => i + 1);

  const head = `<h2>${esc(o.title)} · ${MONTHS[o.month]} ${o.year}</h2>
  <p>ООО «Глобал-Стройинжиниринг»${o.project ? ` · ${esc(o.project)}` : ''}</p>
  <p>Ответственный: ${esc(o.chief)} · составлено ${new Date().toLocaleDateString('ru')}</p>`;

  const table = `<table>
    <tr>
      <th rowspan="2">№</th><th rowspan="2">Ф.И.О.</th><th rowspan="2">Должность</th>
      <th rowspan="2">Объект</th>
      <th colspan="${days.length}">Отработано часов по дням месяца</th>
      <th rowspan="2">Смен</th><th rowspan="2">Итого часов</th>
    </tr>
    <tr>${days.map((d) => `<th>${d}</th>`).join('')}</tr>
    ${rows
      .map(
        (r, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${esc(r.user.fio)}</td>
      <td>${esc(ROLE_LABEL[r.user.role])}</td>
      <td>${esc(r.objects.join(', '))}</td>
      ${days.map((d) => `<td class="c">${r.days[d] ? fmtHours(r.days[d]) : ''}</td>`).join('')}
      <td class="c">${r.workDays}</td>
      <td class="c">${fmtHours(r.hours)}</td>
    </tr>`,
      )
      .join('')}
    <tr class="t">
      <td colspan="4">Итого по проекту</td>
      ${days
        .map(
          (d) =>
            `<td class="c">${
              fmtHours(rows.reduce((a, r) => a + (r.days[d] || 0), 0)) || ''
            }</td>`,
        )
        .join('')}
      <td class="c">${rows.reduce((a, r) => a + r.workDays, 0)}</td>
      <td class="c">${fmtHours(rows.reduce((a, r) => a + r.hours, 0))}</td>
    </tr>
  </table>
  <p style="margin-top:12pt">Составил: ${esc(o.chief)} _______________</p>
  <p>Согласовано (руководитель проекта): _______________</p>`;

  const byObject = `<h2>Свод по объектам</h2>
  <table>
    <tr><th>Объект</th><th>Сотрудников</th><th>Смен</th><th>Часов</th></tr>
    ${[...new Set(rows.flatMap((r) => r.objects))]
      .map((obj) => {
        const list = rows.filter((r) => r.objects.includes(obj));
        return `<tr>
        <td>${esc(obj)}</td>
        <td class="c">${list.length}</td>
        <td class="c">${list.reduce((a, r) => a + r.workDays, 0)}</td>
        <td class="c">${fmtHours(list.reduce((a, r) => a + r.hours, 0))}</td>
      </tr>`;
      })
      .join('')}
  </table>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
<x:ExcelWorksheet><x:Name>Табель</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
<x:ExcelWorksheet><x:Name>Свод по объектам</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>${CSS}</style></head>
<body>${head}${table}<br style="page-break-before:always"/>${byObject}</body></html>`;
};

export const downloadTeamSheet = (rows: PersonMonth[], o: SheetOpts) => {
  const html = buildTeamSheetHtml(rows, o);
  const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${o.title} ${MONTHS[o.month]} ${o.year}.xls`.replace(/[/\\:*?"<>|]/g, '-');
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
