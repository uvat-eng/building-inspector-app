import {
  DocCheck,
  DocDefect,
  DocFile,
  contractorStats,
  isDocFixed,
  kindLabel,
} from '@/data/doccontrol';

const esc = (s?: string | number) =>
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
  .t { background: #f2f2f2; font-weight: bold; }
  h2 { font-family: Calibri, Arial, sans-serif; font-size: 12pt; margin: 8pt 0 4pt; }
`;

const book = (sheets: { name: string; html: string }[]) => `<!DOCTYPE html>
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
<body>${sheets.map((s) => s.html).join('<br style="page-break-before:always"/>')}</body></html>`;

const save = (html: string, name: string) => {
  const blob = new Blob([`\ufeff${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[/\\:*?"<>|]/g, '-')}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

const reportHtml = (checks: DocCheck[]) => `<h2>Отчёт по проверке ИТД на ${ruDate(
  new Date().toISOString(),
)}</h2>
<table>
  <tr>
    <th rowspan="2">№ п/п</th>
    <th rowspan="2">Позиция по генеральному плану / шифр раздела проекта</th>
    <th rowspan="2">Ответственный представитель НТН</th>
    <th colspan="3">Общий статус документации</th>
    <th rowspan="2">ПЕРЕДАНО на первичную проверку НТН, папок</th>
    <th rowspan="2">ВОЗВРАЩЕНО после первичной проверки, папок</th>
    <th rowspan="2">НАХОДИТСЯ на первичной проверке, папок</th>
    <th colspan="2">Результаты 1-й проверки</th>
    <th rowspan="2">ПЕРЕДАНО на повторную проверку, папок</th>
    <th rowspan="2">ВОЗВРАЩЕНО после повторной проверки, папок</th>
    <th rowspan="2">НАХОДИТСЯ на повторной проверке, папок</th>
    <th colspan="3">Результаты повторной проверки</th>
    <th rowspan="2">Общее количество выданных замечаний</th>
    <th rowspan="2">Общее количество неустранённых</th>
  </tr>
  <tr>
    <th>Планируемое количество папок</th><th>Сдано заказчику в архив, папок</th>
    <th>Выдано справок НТН</th>
    <th>Количество выданных замечаний</th><th>Дата выдачи замечаний</th>
    <th>Количество неустранённых замечаний</th>
    <th>Количество выданных замечаний при повторной проверке</th>
    <th>Дата повторной проверки</th>
  </tr>
  ${checks
    .map(
      (c, i) => `<tr>
    <td class="c">${i + 1}</td>
    <td>${esc(c.section)}${c.folder ? `<br/>${esc(c.folder)}` : ''}</td>
    <td>${esc(c.repNtn)}</td>
    <td class="c">${c.planned}</td>
    <td class="c">${c.archived}</td>
    <td class="c">${c.certs}</td>
    <td class="c">${c.sent1}</td>
    <td class="c">${c.back1}</td>
    <td class="c">${Math.max(0, c.sent1 - c.back1)}</td>
    <td class="c">${c.issued1}</td>
    <td class="c">${ruDate(c.date1)}</td>
    <td class="c">${c.sent2}</td>
    <td class="c">${c.back2}</td>
    <td class="c">${Math.max(0, c.sent2 - c.back2)}</td>
    <td class="c">${c.open2}</td>
    <td class="c">${c.issued2}</td>
    <td class="c">${ruDate(c.date2)}</td>
    <td class="c">${c.issued1 + c.issued2}</td>
    <td class="c">${c.open2}</td>
  </tr>`,
    )
    .join('')}
</table>`;

const journalHtml = (defects: DocDefect[]) => `<h2>Журнал замечаний СК ООО «ГЛОБАЛ-Стройинжиниринг»
 по проверке исполнительной документации</h2>
<table>
  <tr>
    <th rowspan="2">№ п/п</th><th rowspan="2">Дата выдачи</th><th rowspan="2">Организация</th>
    <th rowspan="2">Объект</th><th rowspan="2">Позиция</th>
    <th rowspan="2">Содержание замечания (выявленные отступления)</th>
    <th rowspan="2">Запись произвел (Ф.И.О. контролирующего лица)</th>
    <th rowspan="2">С записью ознакомился</th>
    <th colspan="2">Отчет об устранении</th>
    <th rowspan="2">Всего</th><th rowspan="2">Устранено</th><th rowspan="2">Не устранено</th>
  </tr>
  <tr><th>статус</th><th>дата устранения</th></tr>
  ${defects
    .map(
      (d, i) => `<tr>
    <td class="c">${i + 1}</td>
    <td class="c">${ruDate(d.date)}</td>
    <td>${esc(d.contractor)}</td>
    <td>${esc(d.objectTitle)}</td>
    <td>${esc(d.position)}</td>
    <td>${esc(d.content)}</td>
    <td>${esc(d.recordedBy)}</td>
    <td>${esc(d.ackBy)}</td>
    <td class="c">${esc(d.fixStatus)}</td>
    <td class="c">${ruDate(d.fixDate)}</td>
    <td class="c">1</td>
    <td class="c">${isDocFixed(d.fixStatus) ? 1 : 0}</td>
    <td class="c">${isDocFixed(d.fixStatus) ? 0 : 1}</td>
  </tr>`,
    )
    .join('')}
  <tr class="t">
    <td colspan="10">Итого</td>
    <td class="c">${defects.length}</td>
    <td class="c">${defects.filter((d) => isDocFixed(d.fixStatus)).length}</td>
    <td class="c">${defects.filter((d) => !isDocFixed(d.fixStatus)).length}</td>
  </tr>
</table>`;

const psdHtml = (checks: DocCheck[], defects: DocDefect[], files: DocFile[]) => {
  const stats = contractorStats(checks, defects, files);
  return `<h2>Таблица проверки ПСД подрядчиков на ${ruDate(new Date().toISOString())}</h2>
<table>
  <tr>
    <th>Наименование подрядчика</th>
    <th>Предполагаемое количество папок</th>
    <th>Передано в архив</th>
    <th>Выдано справок</th>
    <th>Сдано на первичную проверку</th>
    <th>Проверено и возвращено</th>
    <th>Оформлено папок текущей документации</th>
    <th>Выдано замечаний</th>
    <th>Устранено замечаний</th>
    <th>Не устранено</th>
    <th>Загружено файлов</th>
  </tr>
  ${stats
    .map(
      (s) => `<tr>
    <td>${esc(s.contractor)}</td>
    <td class="c">${s.planned}</td>
    <td class="c">${s.archived}</td>
    <td class="c">${s.certs}</td>
    <td class="c">${s.sent1}</td>
    <td class="c">${s.back1}</td>
    <td class="c">${s.sent1}</td>
    <td class="c">${s.issued}</td>
    <td class="c">${s.fixed}</td>
    <td class="c">${s.open}</td>
    <td class="c">${s.files}</td>
  </tr>`,
    )
    .join('')}
</table>`;
};

const filesHtml = (files: DocFile[]) => `<h2>Учёт загруженных файлов по подрядчикам</h2>
<table>
  <tr>
    <th>№</th><th>Подрядчик</th><th>Тип документа</th><th>Наименование</th>
    <th>Файл</th><th>Размер, КБ</th><th>Загрузил</th><th>Дата</th><th>Примечание</th>
  </tr>
  ${files
    .map(
      (f, i) => `<tr>
    <td class="c">${i + 1}</td>
    <td>${esc(f.contractor)}</td>
    <td>${esc(kindLabel(f.kind))}</td>
    <td>${esc(f.title)}</td>
    <td>${esc(f.url)}</td>
    <td class="c">${f.sizeKb}</td>
    <td>${esc(f.uploadedBy)}</td>
    <td class="c">${ruDate(f.createdAt)}</td>
    <td>${esc(f.note)}</td>
  </tr>`,
    )
    .join('')}
</table>`;

export const downloadDocReport = (
  checks: DocCheck[],
  defects: DocDefect[],
  files: DocFile[],
  contractor?: string,
) => {
  const c = contractor ? checks.filter((x) => x.contractor === contractor) : checks;
  const d = contractor ? defects.filter((x) => x.contractor === contractor) : defects;
  const f = contractor ? files.filter((x) => x.contractor === contractor) : files;

  save(
    book([
      { name: 'ОТЧЕТ', html: reportHtml(c) },
      { name: 'Журнал_', html: journalHtml(d) },
      { name: 'ПСД подрядчиков', html: psdHtml(c, d, f) },
      { name: 'Файлы', html: filesHtml(f) },
    ]),
    `${new Date().toLocaleDateString('ru')}г. Отчет и журнал о проверке ИТД${
      contractor ? ` (${contractor})` : ''
    }`,
  );
};
