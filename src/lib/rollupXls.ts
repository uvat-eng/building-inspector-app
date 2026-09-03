import { DefectRow, CATEGORIES } from '@/data/inspections';
import { Order } from '@/data/orders';

const esc = (s?: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ruDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('ru');
};

const parseRu = (v?: string) => {
  if (!v) return null;
  const m = v.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}`);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isDone = (s?: string) => (s ?? '').toLowerCase().startsWith('устранен');

const CSS = `
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
  td, th { border: 1px solid #999; padding: 3pt 5pt; vertical-align: top; }
  th { background: #dbe5f1; font-weight: bold; text-align: center; }
  .t { background: #f2f2f2; font-weight: bold; }
  .c { text-align: center; }
  h2 { font-family: Calibri, Arial, sans-serif; font-size: 13pt; margin: 8pt 0 4pt; }
`;

const book = (sheets: { name: string; html: string }[]) => `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
${sheets
  .map(
    (s) =>
      `<x:ExcelWorksheet><x:Name>${s.name}</x:Name>` +
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

export interface RollupCtx {
  objectTitle: (id: string) => string;
  contractorOf: (d: DefectRow) => string;
}

export const buildOrdersRollupHtml = (
  orders: Order[],
  defects: DefectRow[],
  ctx: RollupCtx,
) => {
  const today = new Date();
  const contractors = [...new Set(orders.map((o) => o.issuedTo).filter(Boolean))];

  const stat = (list: Order[]) => {
    const stop = list.filter((o) => o.stopWorks).length;
    const done = list.filter((o) => o.status === 'done');
    const late = done.filter((o) => {
      const dl = parseRu(o.deadline);
      const fx = parseRu(o.fixDate);
      return dl && fx && fx > dl;
    }).length;
    const open = list.filter((o) => o.status !== 'done');
    const expired = open.filter((o) => {
      const dl = parseRu(o.deadline);
      return dl && dl < today;
    }).length;
    return {
      total: list.length,
      stop,
      noStop: list.length - stop,
      done: done.length,
      inTime: done.length - late,
      late,
      open: open.length,
      expired,
      openStop: open.filter((o) => o.stopWorks).length,
    };
  };

  const rowFor = (name: string, list: Order[]) => {
    const s = stat(list);
    return `<tr>
      <td>${esc(name)}</td>
      <td class="c">${s.total}</td><td class="c">${s.stop}</td><td class="c">${s.noStop}</td>
      <td class="c">${s.done}</td><td class="c">${s.inTime}</td><td class="c">${s.late}</td>
      <td class="c">${s.open}</td><td class="c">${s.expired}</td><td class="c">${s.openStop}</td>
    </tr>`;
  };

  const summary = `<h2>Сводный отчет по предписаниям на ${ruDate(today.toISOString())}</h2>
  <table>
    <tr>
      <th rowspan="2">Подрядчик</th>
      <th colspan="3">Выдано предписаний, шт.</th>
      <th colspan="3">Устранено предписаний, шт.</th>
      <th colspan="3">Не устранено предписаний, шт.</th>
    </tr>
    <tr>
      <th>Всего</th><th>С остановкой</th><th>Без остановки</th>
      <th>Всего</th><th>В срок</th><th>С опозданием</th>
      <th>Всего</th><th>Срок истек</th><th>С остановкой работ</th>
    </tr>
    ${contractors.map((c) => rowFor(c, orders.filter((o) => o.issuedTo === c))).join('')}
    <tr class="t">${rowFor('Всего', orders).replace('<tr>', '').replace('</tr>', '')}</tr>
  </table>`;

  const catRow = (name: string, list: DefectRow[]) => {
    const cells = CATEGORIES.map((c) => {
      const inCat = list.filter((d) => (d.category || '') === c);
      return `<td class="c">${inCat.length}</td><td class="c">${
        inCat.filter((d) => isDone(d.fixStatus)).length
      }</td>`;
    }).join('');
    return `<tr><td>${esc(name)}</td><td class="c">${list.length}</td><td class="c">${
      list.filter((d) => isDone(d.fixStatus)).length
    }</td>${cells}</tr>`;
  };

  const points = `<h2>Сводный отчет по пунктам предписаний</h2>
  <table>
    <tr>
      <th rowspan="2">Подрядчик</th><th colspan="2">Всего</th>
      ${CATEGORIES.map((c) => `<th colspan="2">${esc(c)}</th>`).join('')}
    </tr>
    <tr>
      <th>выдано</th><th>устранено</th>
      ${CATEGORIES.map(() => '<th>выдано</th><th>устранено</th>').join('')}
    </tr>
    ${contractors
      .map((c) => catRow(c, defects.filter((d) => ctx.contractorOf(d) === c)))
      .join('')}
    <tr class="t">${catRow('Всего', defects).replace('<tr>', '').replace('</tr>', '')}</tr>
  </table>`;

  const detail = `<h2>Реестр пунктов предписаний</h2>
  <table>
    <tr>
      <th>№ п/п</th><th>Наименование подрядной организации</th><th>Кол. пункт</th>
      <th>Содержание замечаний</th><th>Указание нормативного документа и пункта</th>
      <th>Ссылка на проектную документацию</th><th>Наименование объекта и его местоположение</th>
      <th>№ предписания</th><th>Дата выдачи</th><th>Срок</th><th>Факт</th>
      <th>№ и дата письма о продлении сроков</th><th>Отметка о выполнении</th>
      <th>Ответственный за проведение работ</th><th>ФИО инженера СК</th><th>Характер предписания</th>
    </tr>
    ${defects
      .map(
        (d, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${esc(ctx.contractorOf(d))}</td>
      <td class="c">${d.pos}</td>
      <td>${esc(d.title)}</td>
      <td>${esc(d.normRef)}</td>
      <td>${esc(d.docRef)}</td>
      <td>${esc(d.place || ctx.objectTitle(d.objectId))}</td>
      <td>${esc(d.inspNumber)}</td>
      <td class="c">${ruDate(d.inspDate)}</td>
      <td class="c">${esc(d.deadline)}</td>
      <td class="c">${esc(d.fixDate)}</td>
      <td>${esc(d.extendNote)}</td>
      <td class="c">${esc(d.fixStatus)}</td>
      <td>${esc(d.responsible)}</td>
      <td>${esc(d.inspector)}</td>
      <td>${esc(d.category)}</td>
    </tr>`,
      )
      .join('')}
  </table>`;

  return book([
    { name: 'Свод по предписаниям', html: summary + points },
    { name: 'Реестр пунктов', html: detail },
  ]);
};

export const downloadOrdersRollup = (orders: Order[], defects: DefectRow[], ctx: RollupCtx) =>
  save(
    buildOrdersRollupHtml(orders, defects, ctx),
    `ГСИ Ежедневный отчет по предписаниям от ${ruDate(new Date().toISOString())}`,
  );

export const buildDefectsJournalHtml = (defects: DefectRow[], ctx: RollupCtx) => {
  const contractors = [...new Set(defects.map(ctx.contractorOf).filter(Boolean))];

  const head = `<h2>Реестр замечаний, отраженных в журналах замечаний и предложений
   на ${ruDate(new Date().toISOString())}</h2>
  <table>
    <tr>
      <th rowspan="2">Подрядная организация</th>
      <th colspan="2">Выдано замечаний</th>
      <th colspan="2">Устранено замечаний</th>
      <th colspan="2">Не устранено замечаний</th>
    </tr>
    <tr>
      <th>ответственность подрядчика</th><th>ответственность заказчика</th>
      <th>ответственность подрядчика</th><th>ответственность заказчика</th>
      <th>ответственность подрядчика</th><th>ответственность заказчика</th>
    </tr>
    ${contractors
      .map((c) => {
        const list = defects.filter((d) => ctx.contractorOf(d) === c);
        const byResp = (resp: string, done?: boolean) =>
          list.filter(
            (d) =>
              (d.responsibility || 'вопрос подрядчика') === resp &&
              (done === undefined || isDone(d.fixStatus) === done),
          ).length;
        return `<tr>
        <td>${esc(c)}</td>
        <td class="c">${byResp('вопрос подрядчика')}</td>
        <td class="c">${byResp('вопрос заказчика')}</td>
        <td class="c">${byResp('вопрос подрядчика', true)}</td>
        <td class="c">${byResp('вопрос заказчика', true)}</td>
        <td class="c">${byResp('вопрос подрядчика', false)}</td>
        <td class="c">${byResp('вопрос заказчика', false)}</td>
      </tr>`;
      })
      .join('')}
  </table>`;

  const journal = `<h2>Журнал замечаний</h2>
  <table>
    <tr>
      <th>№ п/п</th><th>Дата</th><th>Организация</th><th>Объект</th>
      <th>Содержание замечания и предложения</th>
      <th>Запись произвел (должность, организация, Ф.И.О.)</th>
      <th>С записью ознакомился</th><th>Выполненные мероприятия</th>
      <th>Статус</th><th>Дата устранения</th><th>Ответственность</th>
      <th>Выдано предписание / комментарии</th><th>Характер замечания</th>
      ${CATEGORIES.map((c) => `<th>${esc(c)}</th>`).join('')}
    </tr>
    ${defects
      .map(
        (d, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td class="c">${ruDate(d.inspDate)}</td>
      <td>${esc(ctx.contractorOf(d))}</td>
      <td>${esc(d.place || ctx.objectTitle(d.objectId))}</td>
      <td>${esc(d.title)}${d.normRef ? `<br/>${esc(d.normRef)}` : ''}</td>
      <td>${esc(d.inspector)}</td>
      <td>${esc(d.ackBy)}</td>
      <td>${esc(d.measures)}</td>
      <td class="c">${esc(d.fixStatus)}</td>
      <td class="c">${esc(d.fixDate)}</td>
      <td>${esc(d.responsibility)}</td>
      <td>${esc(d.extendNote || d.inspNumber)}</td>
      <td>${esc(d.category)}</td>
      ${CATEGORIES.map((c) => `<td class="c">${(d.category || '') === c ? 1 : ''}</td>`).join('')}
    </tr>`,
      )
      .join('')}
  </table>`;

  return book([{ name: 'Журнал замечаний', html: head + journal }]);
};

export const downloadDefectsJournal = (defects: DefectRow[], ctx: RollupCtx) =>
  save(
    buildDefectsJournalHtml(defects, ctx),
    `Журнал замечаний. ООО ГСИ от ${ruDate(new Date().toISOString())}`,
  );
