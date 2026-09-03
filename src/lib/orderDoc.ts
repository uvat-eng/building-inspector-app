import { Order, Contractor } from '@/data/orders';

const esc = (s?: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ruDate = (iso: string) => new Date(iso || Date.now()).toLocaleDateString('ru');

const ruLong = (iso: string) => {
  const d = new Date(iso || Date.now());
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
};

const line = (v?: string, min = 24) => {
  const t = esc(v || '').trim();
  return t || '_'.repeat(min);
};

export const ORDER_CSS = `
  @page { size: A4; margin: 1.6cm 1.4cm; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; color: #000; }
  p { margin: 3pt 0; }
  .center { text-align: center; }
  .head { font-weight: bold; }
  .hint { font-size: 8.5pt; font-style: italic; text-align: center; color: #333; }
  h1 { font-size: 13pt; text-align: center; text-transform: uppercase; margin: 12pt 0 8pt; }
  table.grid { border-collapse: collapse; width: 100%; margin: 8pt 0; table-layout: fixed; }
  table.grid td, table.grid th { border: 1px solid #000; padding: 4pt 5pt; vertical-align: top;
    font-size: 9.5pt; word-wrap: break-word; }
  table.grid th { text-align: center; font-size: 8.5pt; text-transform: uppercase; }
  table.plain { border-collapse: collapse; width: 100%; }
  table.plain td { border: none; padding: 2pt 0; vertical-align: top; }
  .sign { border-collapse: collapse; width: 100%; margin-top: 14pt; }
  .sign td { border: 1px solid #000; padding: 5pt 6pt; font-size: 10pt; }
  .small { font-size: 8.5pt; font-style: italic; }
  .note { font-size: 9pt; margin-top: 10pt; }
  .brk { page-break-before: always; }
`;

export const orderBodyHtml = (order: Order, contractor?: Contractor | null) => {
  const b = order.body ?? {};
  const items = b.items ?? [];
  const issuedTo = order.issuedTo || contractor?.name || '';

  const rows = items.length
    ? items
        .map(
          (it, i) => `
      <tr>
        <td class="center" style="width:5%">${i + 1}</td>
        <td style="width:41%">${esc(it.title)}</td>
        <td style="width:24%">${esc(it.normRef || '—')}</td>
        <td style="width:20%">Устранить нарушение.<br/>Срок: ${esc(it.deadline || order.deadline || '—')}</td>
        <td class="center" style="width:10%">${it.photos?.length ? `фото ${i + 1}` : '—'}</td>
      </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="center">нарушений не выявлено</td></tr>';

  const nums = items.map((_, i) => i + 1);
  const range =
    nums.length === 0 ? '—' : nums.length === 1 ? `№1` : `№1 — №${nums.length}`;

  return `
  <p class="head">${esc(b.inspectionOrg || 'ООО «ГЛОБАЛ-Стройинжиниринг»')}</p>
  <p class="head">Объект строительства: «${esc(b.objectTitle || '')}»</p>
  <p class="head">Шифр объекта: ${line(b.objectCode, 20)}</p>
  <p style="margin-top:8pt">${ruLong(order.createdAt)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Время ${esc(b.time || '__:__')}</p>

  <h1>Предписание № ${esc(order.number)}</h1>

  <p>Выдано ${line(issuedTo, 46)}</p>
  <p class="hint">(наименование организации, осуществляющей строительство)</p>
  <p>осуществляющей строительство на основании договора подряда</p>
  <p>№ ${line(b.contractNo, 22)} от ${line(b.contractDate, 14)}</p>
  <p class="hint">(№ договора подряда и дата заключения договора)</p>

  <p style="margin-top:6pt">Мною, представителем независимого строительного контроля:
  Инспектор СК ${esc(b.inspectionOrg || 'ООО «ГЛОБАЛ-Стройинжиниринг»')} ${line(order.inspector, 26)}</p>
  <p class="hint">(фамилия И.О. ответственного представителя организации, осуществляющей строительный контроль)</p>
  <p>На основании документа № ${line(b.assignDocNo, 10)} от ${line(b.assignDocDate, 14)}</p>
  <p class="hint">(№ и дата распорядительного документа о назначении специалиста НСК на объект)</p>

  <p style="margin-top:6pt">В присутствии:</p>
  <p>Ответственного представителя застройщика/технического заказчика:</p>
  <p>${line(b.customerRep, 60)}</p>
  <p class="hint">(должность, Фамилия И.О.)</p>
  <p>Ответственного представителя строительного подрядчика, осуществляющего строительство:</p>
  <p>${line(b.contractorRep, 60)}</p>
  <p class="hint">(наименование лица, осуществляющего строительство (генеральный строительный подрядчик), должность, Ф.И.О представителя)</p>

  <p style="margin-top:8pt">По результатам проведенной проверки соответствия выполняемых работ
  требованиям нормативных актов, ПД, РД, требованиям технических регламентов, требованиям
  градостроительного плана земельного участка выявлены следующие нарушения:</p>

  <table class="grid">
    <tr>
      <th>№ п/п</th>
      <th>Краткое изложение выявленного нарушения с указанием места обнаружения</th>
      <th>Пункт требований тех. регламентов, иных нормативных правовых актов, проектной и рабочей документации, требования которых не исполнены</th>
      <th>Предлагаемые меры и срок устранения нарушения</th>
      <th>№ фотодокумента</th>
    </tr>
    ${rows}
  </table>

  <p>Предлагаю:</p>
  <p>Устранить несоответствия ${range} до ${esc(order.deadline || '__.__.____')}.</p>
  <p>Срок исполнения (в случае остановки работ — до устранения нарушения) ${line(b.stopNote, 12)}.</p>
  <p>Остановить производство (заполнить в случае остановки работ) ${line(b.stopWorks, 14)}.</p>
  <p>Вид работ, отдельный этап работ (земляные, сварочные, АКЗ и т. д.): ${line(b.workType, 26)}</p>
  <p>Приложение: фотоматериалы на ${items.length || '__'} л.</p>

  <p class="note">В связи с тем, что выявленные в ходе проверки факты повлекли нарушения нормативных
  и правовых актов, руководствуясь статьей 53 Градостроительного кодекса Российской Федерации
  от 29.12.2004 № 190-ФЗ и статьями 705, 706, 714, 715, 720, 721, 723, 745, 748, 751, 753, 754, 755
  Гражданского кодекса Российской Федерации данное предписание может служить основанием для
  остановки работ и ведения претензионной работы.</p>

  <p class="note">Вам предписывается устранить вышеуказанные нарушения в установленные для этого
  сроки и направить Акт об устранении каждого пункта настоящего предписания с перечислением
  принятых мер, подтверждающих факт устранения нарушений, ответственному представителю
  организации по независимому строительному контролю для освидетельствования устранения
  выявленных нарушений по настоящему предписанию.</p>

  <p style="margin-top:10pt">Предписание № ${esc(order.number)} к исполнению принял:</p>
  <p>Ответственный представитель лица, осуществляющего строительство</p>
  <p>${line(b.contractorRep, 60)}</p>
  <p class="hint">(наименование лица, осуществляющего строительство (генеральный строительный подрядчик), должность, Ф.И.О. представителя, дата, подпись)</p>

  <table class="sign">
    <tr><td width="55%">Предписание выдал ответственный представитель НСК:</td><td>Подпись, дата</td></tr>
    <tr><td>Инспектор СК ${esc(order.inspector)}</td><td>&nbsp;</td></tr>
    <tr><td class="small">(должность, ФИО)</td><td class="small">(подпись, дата)</td></tr>
    <tr><td>Представитель Заказчика:</td><td>Подпись, дата</td></tr>
    <tr><td>${line(b.customerRep, 40)}</td><td>&nbsp;</td></tr>
    <tr><td class="small">(должность, ФИО)</td><td class="small">(подпись, дата)</td></tr>
  </table>

  <p style="margin-top:10pt">Копии направлены:</p>
  <p>${line(b.customerName, 40)}</p>
  <p>${line(issuedTo, 40)}</p>

  <p class="note">Примечание: В случае отказа ответственного представителя строительного подрядчика
  от подписи, в Предписание в графу «Ответственный представитель лица, осуществляющего
  строительство» вносится запись «От подписи отказался».</p>`;
};

export const buildOrderHtml = (order: Order, contractor?: Contractor | null) =>
  `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Предписание № ${esc(order.number)}</title>
<style>${ORDER_CSS}</style></head>
<body>${orderBodyHtml(order, contractor)}</body></html>`;

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

export const downloadOrder = (order: Order, contractor?: Contractor | null) =>
  saveDoc(buildOrderHtml(order, contractor), `Предписание ${order.number}`);

export const buildOrdersDigestHtml = (
  orders: Order[],
  opts: { title?: string; objectTitle?: (o: Order) => string } = {},
) => {
  const objTitle = opts.objectTitle ?? ((o: Order) => o.body.objectTitle || '');

  const summary = orders
    .map((o, i) => {
      const items = o.body.items ?? [];
      return `
      <tr>
        <td class="center">${i + 1}</td>
        <td class="center">${esc(o.number)}</td>
        <td class="center">${ruDate(o.createdAt)}</td>
        <td>${esc(objTitle(o))}</td>
        <td>${esc(o.issuedTo || '—')}</td>
        <td class="center">${items.length}</td>
        <td class="center">${esc(o.deadline || '—')}</td>
        <td class="center">${o.status === 'done' ? 'Устранено' : 'Открыто'}</td>
      </tr>`;
    })
    .join('');

  const open = orders.filter((o) => o.status !== 'done').length;
  const violations = orders.reduce((s, o) => s + (o.body.items ?? []).length, 0);

  const pages = orders
    .map((o) => `<div class="brk">${orderBodyHtml(o)}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Сводный реестр предписаний</title>
<style>${ORDER_CSS}</style></head>
<body>
  <p class="head center">ООО «ГЛОБАЛ-Стройинжиниринг»</p>
  <h1>Сводный реестр предписаний</h1>
  <p class="center">${esc(opts.title || 'По всем объектам')} · на ${ruDate(new Date().toISOString())}</p>

  <table class="plain" style="margin-top:8pt">
    <tr><td width="40%">Всего предписаний:</td><td><b>${orders.length}</b></td></tr>
    <tr><td>В том числе не устранено:</td><td><b>${open}</b></td></tr>
    <tr><td>Всего выявленных нарушений:</td><td><b>${violations}</b></td></tr>
  </table>

  <table class="grid">
    <tr>
      <th style="width:5%">№</th>
      <th style="width:10%">Предписание №</th>
      <th style="width:11%">Дата</th>
      <th style="width:24%">Объект</th>
      <th style="width:22%">Кому выдано</th>
      <th style="width:8%">Нарушений</th>
      <th style="width:11%">Срок</th>
      <th style="width:9%">Статус</th>
    </tr>
    ${summary || '<tr><td colspan="8" class="center">предписаний нет</td></tr>'}
  </table>

  <p class="note">Ниже приведены все предписания реестра по форме Заказчика.</p>
  ${pages}
</body></html>`;
};

export const downloadOrdersDigest = (
  orders: Order[],
  opts: { title?: string; objectTitle?: (o: Order) => string } = {},
) => saveDoc(buildOrdersDigestHtml(orders, opts), 'Сводный реестр предписаний');
