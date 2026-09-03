import { IndReport, KIND_META } from '@/data/indreports';

const esc = (s?: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const nl = (s?: string) => esc(s).replace(/\n/g, '<br/>');

const ruDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('ru');
};

const CSS = `
  @page { size: A4; margin: 1.2cm; }
  body { font-family: 'Times New Roman', serif; font-size: 10.5pt; color: #000; }
  h1 { font-size: 13pt; text-align: center; margin: 0 0 8pt; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; margin-bottom: 8pt; }
  td, th { border: 1px solid #000; padding: 3pt 5pt; vertical-align: top; font-size: 9.5pt;
    word-wrap: break-word; }
  th { background: #eee; text-align: center; font-size: 8.5pt; text-transform: uppercase; }
  .sec td { background: #ddd; font-weight: bold; text-align: center; text-transform: uppercase; }
  .lbl { background: #f5f5f5; font-weight: bold; width: 22%; }
  .ph { height: 62mm; text-align: center; vertical-align: middle; }
  .ph img { max-width: 100%; max-height: 58mm; }
  .cap { text-align: center; font-size: 9.5pt; }
`;

const rowsTable = (
  head: string[],
  rows: (string | undefined)[][],
  widths?: string[],
) => {
  if (rows.length === 0) return '';
  return `<table>
    <tr>${head.map((h, i) => `<th${widths?.[i] ? ` style="width:${widths[i]}"` : ''}>${esc(h)}</th>`).join('')}</tr>
    ${rows.map((r) => `<tr>${r.map((c) => `<td>${nl(c || '—')}</td>`).join('')}</tr>`).join('')}
  </table>`;
};

export const buildIndReportHtml = (r: IndReport, objectTitle = '') => {
  const d = r.data ?? {};
  const photos = d.photos ?? [];

  const pairs: { url: string; caption: string }[][] = [];
  for (let i = 0; i < photos.length; i += 2) pairs.push(photos.slice(i, i + 2));

  const photoBlock = pairs.length
    ? `<table class="sec"><tr><td colspan="2">Фотоотчет</td></tr></table>
       ${pairs
         .map(
           (pair) => `<table>
        <tr>${pair.map((p) => `<td class="ph"><img src="${p.url}" /></td>`).join('')}${
          pair.length === 1 ? '<td class="ph"></td>' : ''
        }</tr>
        <tr>${pair.map((p) => `<td class="cap">${esc(p.caption)}</td>`).join('')}${
          pair.length === 1 ? '<td class="cap"></td>' : ''
        }</tr>
      </table>`,
         )
         .join('')}`
    : '';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Индивидуальный отчёт № ${esc(r.number)}</title>
<style>${CSS}</style></head>
<body>
  <h1>Ежедневный индивидуальный отчёт<br/>по строительному контролю</h1>

  <table>
    <tr>
      <td class="lbl">Отчет №</td><td style="width:14%">${esc(r.number)}</td>
      <td class="lbl">Объект</td><td>${nl(d.objectTitle || objectTitle)}</td>
    </tr>
    <tr>
      <td class="lbl">Дата</td><td>${ruDate(r.date)}</td>
      <td class="lbl">Направление контроля</td>
      <td>${esc(d.direction || KIND_META[r.kind]?.label || '')}</td>
    </tr>
  </table>

  <table class="sec"><tr><td colspan="4">Данные заказчика · информация о договоре</td></tr></table>
  <table>
    <tr><td class="lbl">Название</td><td>${esc(d.customerName)}</td>
        <td class="lbl">Номер</td><td>${esc(d.contractNo)}</td></tr>
    <tr><td class="lbl">Адрес</td><td>${esc(d.customerAddress)}</td>
        <td class="lbl">Дата</td><td>${esc(d.contractDate)}</td></tr>
    <tr><td class="lbl">Тел.</td><td>${esc(d.customerPhone)}</td>
        <td class="lbl">Наряд-заказ</td><td>${esc(d.orderNo)}</td></tr>
    <tr><td class="lbl">E-mail</td><td>${esc(d.customerEmail)}</td>
        <td class="lbl">Заявка №</td><td>${esc(d.requestNo)}</td></tr>
    <tr><td class="lbl">Копии</td><td>${nl(d.customerCopies)}</td>
        <td class="lbl">Руководитель</td><td>${esc(d.customerHead)}</td></tr>
  </table>

  <table class="sec"><tr><td colspan="2">Информация о подрядчике / субподрядчике</td></tr></table>
  <table>
    <tr><td class="lbl">Инспекция проведена</td><td>${esc(d.inspectionWith)}</td></tr>
    <tr><td class="lbl">Генподрядчик</td><td>${esc(d.generalContractor)}</td></tr>
    <tr><td class="lbl">Субподрядчик</td><td>${esc(d.subcontractor || '—')}</td></tr>
    <tr><td class="lbl">Договор</td><td>${esc(d.contractorContract)}</td></tr>
    <tr><td class="lbl">Контактное лицо</td><td>${esc(d.contactPerson)}</td></tr>
    <tr><td class="lbl">Контакты</td>
        <td>${[d.contactPhone, d.contactEmail].filter(Boolean).map(esc).join(' · ') || '—'}</td></tr>
  </table>

  <table class="sec"><tr><td colspan="4">Статус строительного контроля</td></tr></table>
  <table>
    <tr><th>Статус</th><th>Погодная характеристика</th><th>Время ведения контроля</th>
        <th>Инспектор предыдущей смены</th></tr>
    <tr><td>${esc(d.status || '—')}</td><td>${esc(d.weather)}</td>
        <td>${esc(d.workTime)}</td><td>${esc(d.prevInspector || '—')}</td></tr>
  </table>

  <table class="sec"><tr><td colspan="3">Результат строительного контроля и вывод</td></tr></table>
  <table>
    <tr><th style="width:58%">Описание действий</th><th style="width:18%">Участок, ПК</th>
        <th>Ссылка</th></tr>
    <tr><td>${nl(d.actions)}</td><td>${nl(d.area)}</td><td>${nl(d.reference)}</td></tr>
  </table>

  ${rowsTable(
    ['№', 'Начало', 'Окончание', 'Вид работ', 'Ответственный ИТР'],
    (d.permits ?? []).map((p) => [p.number, p.start, p.end, p.work, p.responsible]),
    ['8%', '13%', '13%', '24%', ''],
  )}

  ${
    d.zogDate || d.zogStatus || d.zogNote
      ? `<table>
    <tr><th>Заключение о готовности · дата выдачи</th><th>Статус ЗоГ</th><th>Примечание</th></tr>
    <tr><td>${esc(d.zogDate)}</td><td>${esc(d.zogStatus)}</td><td>${esc(d.zogNote || '—')}</td></tr>
  </table>`
      : ''
  }

  ${rowsTable(
    ['Объём выполненных работ', 'Ед. изм.', 'Кол-во'],
    (d.volumes ?? []).map((v) => [v.name, v.unit, v.qty]),
    ['', '16%', '16%'],
  )}

  ${rowsTable(
    ['Шифр', 'Наименование', 'Статус'],
    (d.docs ?? []).map((x) => [x.code, x.name, x.status]),
    ['28%', '', '20%'],
  )}

  ${rowsTable(
    ['Персонал', 'Количество'],
    (d.staff ?? []).map((x) => [x.name, x.qty]),
    ['', '24%'],
  )}

  ${rowsTable(
    ['Техника', 'Количество'],
    (d.machines ?? []).map((x) => [x.name, x.qty]),
    ['', '24%'],
  )}

  ${rowsTable(
    ['Тип оборудования', 'Серийный номер', 'Свидетельство о поверке'],
    (d.equipment ?? []).map((x) => [x.name, x.serial, x.verification]),
    ['', '22%', '32%'],
  )}

  ${photoBlock}

  ${
    d.conclusion
      ? `<table><tr><td class="lbl">Вывод</td><td>${nl(d.conclusion)}</td></tr></table>`
      : ''
  }

  <table>
    <tr><td class="lbl">Инспектор строительного контроля</td>
        <td>${esc(r.authorFio)}</td>
        <td class="lbl" style="width:18%">Подпись, дата</td><td style="width:20%">&nbsp;</td></tr>
  </table>
</body></html>`;
};

const saveDoc = (html: string, name: string) => {
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[/\\:*?"<>|]/g, '-')}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const downloadIndReport = (r: IndReport, objectTitle = '') =>
  saveDoc(
    buildIndReportHtml(r, objectTitle),
    `Индивидуальный отчёт №${r.number || ''} ${ruDate(r.date)}`,
  );
