import { Inspection } from '@/data/inspections';

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ruDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString('ru') : '—');

export const downloadRegistry = (items: Inspection[], objectTitle: string) => {
  const rows = items
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(
      (i, n) => `
      <tr>
        <td style="text-align:center">${n + 1}</td>
        <td>${esc(i.number)}</td>
        <td style="text-align:center">${ruDate(i.createdAt)}</td>
        <td>${esc(i.inspector || '—')}</td>
        <td>${esc(i.workType || '—')}</td>
        <td>${esc(i.subcontractor || i.generalContractor || '—')}</td>
        <td>${esc(i.contractorRep || '—')}</td>
        <td style="text-align:center">${i.defectCount ?? 0}</td>
        <td style="text-align:center">${i.actUrl ? 'В системе' : 'Черновик'}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Реестр актов</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  td, th { border: 1px solid #999; padding: 4pt 6pt; vertical-align: top; }
  th { background: #dbe5f1; font-weight: bold; text-align: center; }
  .title { font-size: 13pt; font-weight: bold; border: none; }
  .sub { border: none; color: #555; }
</style></head>
<body>
<table>
  <tr><td class="title" colspan="9">Реестр актов проверок</td></tr>
  <tr><td class="sub" colspan="9">Объект: ${esc(objectTitle)}</td></tr>
  <tr><td class="sub" colspan="9">Сформирован: ${new Date().toLocaleDateString('ru')} · всего актов: ${items.length}</td></tr>
  <tr><td class="sub" colspan="9"></td></tr>
  <tr>
    <th width="45">№ п/п</th>
    <th width="90">№ акта</th>
    <th width="85">Дата</th>
    <th width="200">ФИО проверяющего</th>
    <th width="200">Вид работ</th>
    <th width="200">Подрядная организация</th>
    <th width="200">Представитель подрядчика</th>
    <th width="80">Замечаний</th>
    <th width="90">Статус</th>
  </tr>
  ${rows || '<tr><td colspan="9" style="text-align:center">Актов нет</td></tr>'}
</table>
</body></html>`;

  const blob = new Blob([`\ufeff${html}`], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Реестр актов проверок — ${objectTitle.replace(/[/\\:*?"<>|]/g, '-')}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};