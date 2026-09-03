import { Vehicle, VehicleLog } from '@/data/vehicles';

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
  .v { background: #d8e4bc; font-size: 8pt; }
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

const HEAD = `
  <tr>
    <th>№ п/п</th>
    <th>Дата</th>
    <th>Автомобиль</th>
    <th>Водитель</th>
    <th>Пробег на конец</th>
    <th>За смену, км</th>
    <th>Маршрут / задание</th>
    <th>Оформил</th>
  </tr>`;

export const downloadWaybills = (
  logs: VehicleLog[],
  vehicles: Vehicle[],
  title: string,
  monthLabel: string,
) => {
  const rows = logs
    .filter((l) => l.kind === 'waybill')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const total = rows.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const body = rows
    .map((l, i) => {
      const v = vehicles.find((x) => x.id === l.vehicleId);
      return `
    <tr>
      <td class="c">${i + 1}</td>
      <td class="c">${ru(l.date)}</td>
      <td>${v ? esc(`${v.plate} · ${v.model}`) : '—'}</td>
      <td>${v ? esc(v.driver) : '—'}</td>
      <td class="c">${l.odometer || ''}</td>
      <td class="c">${l.amount || 0}</td>
      <td>${esc(l.content)}</td>
      <td>${esc(l.author)}</td>
    </tr>`;
    })
    .join('');

  const html = book(
    'Путевые листы',
    `
    <table>
      <tr><td class="t" colspan="8">Реестр путевых листов</td></tr>
      <tr><td class="s" colspan="8">${esc(title)} · ${esc(monthLabel)}</td></tr>
      <tr><td class="s" colspan="8"></td></tr>
    </table>
    <table>
      ${HEAD}
      ${body}
      <tr class="sum">
        <td colspan="5">Итого</td>
        <td>${total}</td>
        <td></td>
        <td></td>
      </tr>
    </table>
  `,
  );

  download(html, `ГСИ Путевые листы ${monthLabel}.xls`);
};
