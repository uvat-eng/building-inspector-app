import {
  CATEGORIES,
  DailyReport,
  ReportRow,
  byContractor,
  statsOf,
} from '@/data/reports';

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

const ru = (iso: string) => (iso ? new Date(iso).toLocaleDateString('ru') : '');

const STYLE = `
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
  td, th { border: 1px solid #808080; padding: 3pt 5pt; vertical-align: top; }
  th { background: #dbe5f1; font-weight: bold; text-align: center; vertical-align: middle; }
  .t { font-size: 14pt; font-weight: bold; border: none; text-align: center; }
  .s { border: none; color: #444; }
  .c { text-align: center; }
  .sum { background: #fde9d9; font-weight: bold; text-align: center; }
  .grp { background: #eaeaea; font-weight: bold; }
`;

const book = (sheet: string, html: string) => `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${sheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>${STYLE}</style></head><body>${html}</body></html>`;

const download = (html: string, name: string) => {
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const rowCells = (r: ReportRow, num: string) => `
  <tr>
    <td class="c">${num}</td>
    <td>${esc(r.contractor)}</td>
    <td class="c">${r.point}</td>
    <td>${esc(r.content)}</td>
    <td>${esc(r.normRef)}</td>
    <td>${esc(r.docRef)}</td>
    <td>${esc(r.place)}</td>
    <td>${esc(r.orderNo)}</td>
    <td class="c">${ru(r.issuedAt)}</td>
    <td class="c">${ru(r.dueAt)}</td>
    <td class="c">${ru(r.factAt)}</td>
    <td>${esc(r.extension)}</td>
    <td class="c">${esc(r.status)}</td>
    <td>${esc(r.responsible)}</td>
    <td>${esc(r.inspector)}</td>
    <td class="c">${esc(r.nature)}</td>
    <td class="c">${esc(r.category)}</td>
    <td class="c">${r.stopWork ? 'да' : ''}</td>
    <td>${(r.photos ?? [])
      .map((u, i) => `<a href="${esc(u)}">фото ${i + 1}</a>`)
      .join('<br>')}</td>
  </tr>`;

const HEAD = `
  <tr>
    <th>№ п/п</th>
    <th>Наименование подрядной организации</th>
    <th>Кол. пункт</th>
    <th>Содержание замечаний</th>
    <th>Указание нормативного документа и пункта</th>
    <th>Ссылка на проектную документацию</th>
    <th>Наименование объекта и его местоположение</th>
    <th>№ предписания</th>
    <th>Дата выдачи</th>
    <th>Срок устранения</th>
    <th>Факт устранения</th>
    <th>№ и дата письма о продлении</th>
    <th>Отметка о выполнении</th>
    <th>Ответственный за проведение работ</th>
    <th>ФИО инженера СК</th>
    <th>Характер предписания</th>
    <th>Категория нарушения</th>
    <th>С остановкой работ</th>
    <th>Фотоматериалы</th>
  </tr>`;

const summary = (rows: ReportRow[]) => {
  const groups = byContractor(rows);
  const total = statsOf(rows);
  const body = groups
    .map(([name, list]) => {
      const s = statsOf(list);
      return `<tr>
        <td>${esc(name)}</td>
        <td class="c">${s.issued}</td><td class="c">${s.stop}</td><td class="c">${s.noStop}</td>
        <td class="c">${s.fixed}</td><td class="c">${s.inTime}</td><td class="c">${s.late}</td>
        <td class="c">${s.open}</td><td class="c">${s.overdue}</td><td class="c">${s.openStop}</td>
      </tr>`;
    })
    .join('');

  return `
  <table>
    <tr>
      <th rowspan="2">Подрядчик</th>
      <th colspan="3">Выдано предписаний, шт.</th>
      <th colspan="3">Устранено, шт.</th>
      <th colspan="3">Не устранено, шт.</th>
    </tr>
    <tr>
      <th>Всего</th><th>С остановкой</th><th>Без остановки</th>
      <th>Всего</th><th>В срок</th><th>С опозданием</th>
      <th>Всего</th><th>Срок истёк</th><th>С остановкой работ</th>
    </tr>
    ${body}
    <tr class="sum">
      <td>Итого</td>
      <td>${total.issued}</td><td>${total.stop}</td><td>${total.noStop}</td>
      <td>${total.fixed}</td><td>${total.inTime}</td><td>${total.late}</td>
      <td>${total.open}</td><td>${total.overdue}</td><td>${total.openStop}</td>
    </tr>
  </table>`;
};

const categoryTable = (rows: ReportRow[]) => {
  const groups = byContractor(rows);
  const head = CATEGORIES.map((c) => `<th colspan="2">${esc(c)}</th>`).join('');
  const sub = CATEGORIES.map(() => '<th>выдано</th><th>устранено</th>').join('');
  const body = groups
    .map(([name, list]) => {
      const cells = CATEGORIES.map((c) => {
        const inCat = list.filter((r) => r.category === c);
        const done = inCat.filter((r) => r.status === 'Устранено').length;
        return `<td class="c">${inCat.length || ''}</td><td class="c">${done || ''}</td>`;
      }).join('');
      const all = list.length;
      const allDone = list.filter((r) => r.status === 'Устранено').length;
      return `<tr><td>${esc(name)}</td><td class="c">${all}</td><td class="c">${allDone}</td>${cells}</tr>`;
    })
    .join('');

  return `
  <table>
    <tr><th rowspan="2">Подрядчик</th><th colspan="2">Всего</th>${head}</tr>
    <tr><th>выдано</th><th>устранено</th>${sub}</tr>
    ${body}
  </table>`;
};

export const downloadDailyReport = (
  report: DailyReport,
  objectTitle: string,
  field: string,
) => {
  const rows = report.rows.map((r, i) => rowCells(r, String(i + 1))).join('');
  const html = book(
    'Ежедневный отчёт',
    `
    <table>
      <tr><td class="t" colspan="19">Сводный отчёт по предписаниям</td></tr>
      <tr><td class="s" colspan="19">Объект: ${esc(objectTitle)}${field ? ` · ${esc(field)}` : ''}</td></tr>
      <tr><td class="s" colspan="19">Дата отчёта: ${ru(report.date)} · инженер СК: ${esc(report.author)}</td></tr>
      <tr><td class="s" colspan="19"></td></tr>
    </table>
    ${summary(report.rows)}
    <br>
    <table>
      <tr><td class="t" colspan="19">Сводный отчёт по пунктам предписаний</td></tr>
    </table>
    ${categoryTable(report.rows)}
    <br>
    <table>${HEAD}${rows}</table>
    ${report.note ? `<table><tr><td class="s">Примечание: ${esc(report.note)}</td></tr></table>` : ''}
  `,
  );
  download(html, `ГСИ Ежедневный отчет по предписаниям от ${ru(report.date)}.xls`);
};

export const downloadJournal = (
  reports: DailyReport[],
  objectTitle: string,
  field: string,
) => {
  const all = reports
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((rep) => rep.rows.map((r) => ({ ...r, repDate: rep.date })));

  const rows = all
    .map(
      (r, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="c">${ru(r.repDate)}</td>
      <td>${esc(r.contractor)}</td>
      <td>${esc(r.place)}</td>
      <td>${esc(r.content)}</td>
      <td>${esc(r.normRef)}</td>
      <td>${esc(r.inspector)}</td>
      <td>${esc(r.responsible)}</td>
      <td class="c">${esc(r.status)}</td>
      <td class="c">${ru(r.factAt)}</td>
      <td>${esc(r.orderNo)}</td>
      <td>${esc(r.extension)}</td>
      <td class="c">${esc(r.category)}</td>
      <td class="c">1</td>
      <td>${(r.photos ?? []).map((u, i) => `<a href="${esc(u)}">фото ${i + 1}</a>`).join('<br>')}</td>
    </tr>`,
    )
    .join('');

  const plain = all as unknown as ReportRow[];
  const html = book(
    'Журнал замечаний',
    `
    <table>
      <tr><td class="t" colspan="15">Реестр замечаний, отражённых в журналах замечаний и предложений</td></tr>
      <tr><td class="s" colspan="15">Объект строительства: ${esc(objectTitle)}${field ? ` · ${esc(field)}` : ''}</td></tr>
      <tr><td class="s" colspan="15">Сформирован: ${new Date().toLocaleDateString('ru')} · записей: ${all.length} · отчётов: ${reports.length}</td></tr>
      <tr><td class="s" colspan="15"></td></tr>
    </table>
    ${summary(plain)}
    <br>
    <table>
      <tr>
        <th>№ п/п</th><th>Дата</th><th>Организация</th><th>Объект</th>
        <th>Содержание замечания и предложения</th>
        <th>Нормативный документ</th>
        <th>Запись произвёл</th><th>С записью ознакомился</th>
        <th>Отчёт об устранении</th><th>Дата устранения</th>
        <th>Выдано предписание / комментарии</th>
        <th>Продление сроков</th>
        <th>Характер замечания</th><th>Количество</th><th>Фотоматериалы</th>
      </tr>
      ${rows}
    </table>`,
  );
  download(html, `Журнал замечаний. ${objectTitle} от ${new Date().toLocaleDateString('ru')}.xls`);
};