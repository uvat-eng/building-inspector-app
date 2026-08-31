import { Order, Contractor } from '@/data/orders';

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ruDate = (iso: string) => new Date(iso || Date.now()).toLocaleDateString('ru');

export const buildOrderHtml = (order: Order, contractor?: Contractor | null) => {
  const items = order.body.items ?? [];
  const rows = items.length
    ? items
        .map(
          (it, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${esc(it.title)}</td>
        <td>${esc(it.normRef || '—')}</td>
        <td style="text-align:center">${esc(it.deadline || order.deadline || '—')}</td>
      </tr>`,
        )
        .join('')
    : '<tr><td colspan="4" style="text-align:center">—</td></tr>';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Предписание ${esc(order.number)}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; }
  h1 { font-size: 14pt; text-align: center; text-transform: uppercase; }
  table { border-collapse: collapse; width: 100%; margin-top: 12pt; }
  td, th { border: 1px solid #000; padding: 5pt 6pt; vertical-align: top; font-size: 11pt; }
  th { background: #eee; }
  .meta td { border: none; padding: 2pt 0; }
  .sign { margin-top: 28pt; }
</style></head>
<body>
  <h1>Предписание № ${esc(order.number)}</h1>
  <p style="text-align:center">от ${ruDate(order.createdAt)}</p>

  <table class="meta">
    <tr><td width="38%">Объект:</td><td><b>${esc(order.body.objectTitle || '')}</b></td></tr>
    <tr><td>Кому выдано:</td><td>${esc(order.issuedTo || contractor?.name || '—')}</td></tr>
    ${contractor?.inn ? `<tr><td>ИНН:</td><td>${esc(contractor.inn)}</td></tr>` : ''}
    ${contractor?.address ? `<tr><td>Адрес:</td><td>${esc(contractor.address)}</td></tr>` : ''}
    ${contractor?.director ? `<tr><td>Руководитель:</td><td>${esc(contractor.director)}</td></tr>` : ''}
    <tr><td>Генеральный подрядчик:</td><td>${esc(order.body.generalContractor || '—')}</td></tr>
    ${order.body.subcontractor ? `<tr><td>Субподрядная организация:</td><td>${esc(order.body.subcontractor)}</td></tr>` : ''}
    <tr><td>Вид работ:</td><td>${esc(order.body.workType || '—')}</td></tr>
    <tr><td>Раздел проекта:</td><td>${esc(order.body.docRef || '—')}</td></tr>
    <tr><td>Представитель подрядчика:</td><td>${esc(order.body.contractorRep || '—')}</td></tr>
    <tr><td>Выдал:</td><td>${esc(order.inspector)}</td></tr>
  </table>

  <p style="margin-top:14pt">В ходе строительного контроля выявлены нарушения. Требую устранить:</p>

  <table>
    <tr><th width="7%">№ п/п</th><th>Содержание нарушения</th><th width="28%">Ссылка на нормативы</th><th width="16%">Срок устранения</th></tr>
    ${rows}
  </table>

  <table class="meta sign">
    <tr><td width="55%">Инспектор строительного контроля</td><td>_______________ / ${esc(order.inspector)}</td></tr>
    <tr><td style="padding-top:16pt">Предписание получил</td><td style="padding-top:16pt">_______________ / ${esc(order.body.contractorRep || '')}</td></tr>
  </table>
</body></html>`;
};

export const downloadOrder = (order: Order, contractor?: Contractor | null) => {
  const blob = new Blob([`\ufeff${buildOrderHtml(order, contractor)}`], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Предписание ${order.number.replace(/[/\\:*?"<>|]/g, '-')}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};