import { Inspection, InspectionDefect } from '@/data/inspections';

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const ruDate = (iso: string) => new Date(iso || Date.now()).toLocaleDateString('ru');

interface ActData {
  inspection: Inspection;
  defects: InspectionDefect[];
  objectTitle: string;
  contractorName?: string;
}

export const buildActHtml = ({ inspection, defects, objectTitle, contractorName }: ActData) => {
  const rows = defects.length
    ? defects
        .map(
          (d, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${esc(d.title)}</td>
        <td>${esc(d.normRef || '—')}</td>
        <td style="text-align:center">${esc(d.deadline || '—')}</td>
        <td style="text-align:center">${d.photos?.length ? `фото — ${d.photos.length} шт.` : '—'}</td>
      </tr>`,
        )
        .join('')
    : '<tr><td colspan="5" style="text-align:center">Замечаний не выявлено</td></tr>';

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Акт осмотра ${esc(inspection.number)}</title>
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
  <h1>Акт осмотра № ${esc(inspection.number)}</h1>
  <p style="text-align:center">от ${ruDate(inspection.createdAt)}</p>

  <table class="meta">
    <tr><td width="38%">Объект:</td><td><b>${esc(objectTitle)}</b></td></tr>
    <tr><td>Вид контролируемых работ:</td><td>${esc(inspection.workType)}</td></tr>
    <tr><td>Раздел проекта:</td><td>${esc(inspection.docRef)}</td></tr>
    <tr><td>Генеральный подрядчик:</td><td>${esc(inspection.generalContractor || contractorName || '—')}</td></tr>
    <tr><td>Субподрядная организация:</td><td>${esc(inspection.subcontractor || '—')}</td></tr>
    <tr><td>Представитель подрядчика:</td><td>${esc(inspection.contractorRep)}</td></tr>
    <tr><td>Инспектор строительного контроля:</td><td>${esc(inspection.inspector)}</td></tr>
  </table>

  <p style="margin-top:14pt">Результаты осмотра и выявленные замечания:</p>

  <table>
    <tr><th width="6%">№ п/п</th><th>Наименование замечания</th><th width="26%">Ссылка на нормативы</th><th width="14%">Срок устранения</th><th width="12%">Фото</th></tr>
    ${rows}
  </table>

  ${inspection.note ? `<p style="margin-top:12pt">Примечание: ${esc(inspection.note)}</p>` : ''}

  <table class="meta sign">
    <tr><td width="55%">Инспектор строительного контроля</td><td>_______________ / ${esc(inspection.inspector)}</td></tr>
    <tr><td style="padding-top:16pt">Представитель подрядчика</td><td style="padding-top:16pt">_______________ / ${esc(inspection.contractorRep)}</td></tr>
  </table>
</body></html>`;
};

export const downloadAct = (data: ActData) => {
  const blob = new Blob([`\ufeff${buildActHtml(data)}`], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Акт осмотра ${data.inspection.number.replace(/[/\\:*?"<>|]/g, '-')}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};