import { Waybill } from '@/data/waybills';

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

const ru = (iso: string) => (iso ? new Date(iso).toLocaleDateString('ru') : '');

const STYLE = `
  table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9pt; }
  td, th { border: 1px solid #000; padding: 2pt 4pt; vertical-align: top; }
  th { background: #e6e6e6; font-weight: bold; text-align: center; }
  .t { border: none; font-size: 14pt; font-weight: bold; text-align: center; }
  .n { border: none; font-size: 8pt; color: #555; }
  .k { background: #f2f2f2; font-weight: bold; width: 220px; }
  .c { text-align: center; }
  .sec { background: #d9d9d9; font-weight: bold; text-align: center; }
`;

const row = (k: string, v: unknown) =>
  `<tr><td class="k">${esc(k)}</td><td colspan="5">${esc(v)}</td></tr>`;

const four = (k1: string, v1: unknown, k2: string, v2: unknown) =>
  `<tr><td class="k">${esc(k1)}</td><td colspan="2">${esc(v1)}</td>` +
  `<td class="k">${esc(k2)}</td><td colspan="2">${esc(v2)}</td></tr>`;

const sec = (t: string) => `<tr><td class="sec" colspan="6">${esc(t)}</td></tr>`;

export const downloadWaybillSheet = (w: Waybill) => {
  const tasks = w.tasks?.length
    ? w.tasks
        .map(
          (t, i) =>
            `<tr><td class="c">${i + 1}</td><td colspan="2">${esc(t.customer)}</td>` +
            `<td class="c">${esc(t.arrive)}</td><td class="c">${esc(t.leave)}</td>` +
            `<td>${esc(t.work)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="c">задание не заполнено</td></tr>';

  const works = w.works?.length
    ? w.works
        .map(
          (x, i) =>
            `<tr><td class="c">${i + 1}</td><td>${esc(x.route)}</td><td>${esc(x.work)}</td>` +
            `<td class="c">${esc(x.arrive)} / ${esc(x.leave)}</td>` +
            `<td class="c">${esc(x.odoIn)}</td><td class="c">${esc(x.odoOut)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="c">работа не заполнена</td></tr>';

  const run = Math.max(0, (w.odoIn || 0) - (w.odoOut || 0));

  const html = `<table>
<tr><td class="t" colspan="6">ПУТЕВОЙ ЛИСТ СПЕЦИАЛЬНОГО АВТОМОБИЛЯ</td></tr>
<tr><td class="n" colspan="6">№ ${esc(w.number)} ${w.series ? `серия ${esc(w.series)}` : ''} от ${ru(w.wbDate)} · срок действия с ${ru(w.validFrom)} по ${ru(w.validTo)}</td></tr>
${sec('Организация и заказчик')}
${row('Организация', w.org)}
${four('Заказчик', w.customer, 'Ответственное лицо', w.customerPerson)}
${four('Колонна', w.columnNo, 'Бригада', w.brigade)}
${four('Вид перевозки', w.transportKind, 'Вид сообщения', w.messageKind)}
${sec('Автомобиль')}
${four('Марка, модель', w.carModel, 'Госномер', w.carPlate)}
${four('Прицеп', w.trailerModel, 'Госномер прицепа', w.trailerPlate)}
${sec('Водитель')}
${row('Фамилия, имя, отчество', w.driverFio)}
${four('Табельный номер', w.tabNo, 'Класс', w.driverClass)}
${four('Удостоверение', w.license, 'СНИЛС', w.snils)}
${sec('Работа автомобиля')}
${four('Выезд с парковки', w.departAt, 'Возвращение на парковку', w.returnAt)}
${four('Одометр при выезде, км', w.odoOut, 'Одометр при возвращении, км', w.odoIn)}
${four('Пробег за смену, км', run, 'Нулевой пробег, км', w.zeroRun)}
${sec('Движение горючего, л')}
${four('Марка горючего', w.fuelBrand, 'Выдано', w.fuelIssued)}
${four('Остаток при выезде', w.fuelOut, 'Остаток при возвращении', w.fuelIn)}
${four('Сдано', w.fuelReturned, 'Расход по норме', w.fuelNorm)}
${row('Расход фактический', w.fuelFact)}
${sec('Задание водителю')}
<tr><th>№</th><th colspan="2">В чьё распоряжение</th><th>Прибытие</th><th>Убытие</th><th>Вид работы</th></tr>
${tasks}
${sec('Сведения о выполненной работе')}
<tr><th>№</th><th>Маршрут или объект</th><th>Вид работы</th><th>Прибытие / убытие</th><th>Одометр при прибытии</th><th>Одометр при убытии</th></tr>
${works}
${sec('Контроль и отметки')}
${four('Предрейсовый медосмотр', w.medBefore, 'Послерейсовый медосмотр', w.medAfter)}
${four('Предрейсовый контроль ТС', w.techBefore, 'Возвращение ТС', w.techAfter)}
${row('Диспетчер', w.dispatcher)}
${row('Особые отметки', w.notes)}
<tr><td class="n" colspan="6">&nbsp;</td></tr>
<tr><td class="n" colspan="3">Водитель ____________________ / ${esc(w.driverFio)}</td>
<td class="n" colspan="3">Механик ____________________ /</td></tr>
</table>`;

  const book = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Путевой лист</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>${STYLE}</style></head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + book], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Путевой_лист_${w.number || 'без номера'}_${w.wbDate || ''}.xls`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export const downloadWaybillsSummary = (list: Waybill[], title: string) => {
  const rows = list
    .map(
      (w, i) =>
        `<tr><td class="c">${i + 1}</td><td class="c">${esc(w.number)}</td>` +
        `<td class="c">${ru(w.wbDate)}</td><td>${esc(w.carModel)} ${esc(w.carPlate)}</td>` +
        `<td>${esc(w.driverFio)}</td><td>${esc(w.customer)}</td>` +
        `<td class="c">${w.odoOut || 0}</td><td class="c">${w.odoIn || 0}</td>` +
        `<td class="c">${Math.max(0, (w.odoIn || 0) - (w.odoOut || 0))}</td>` +
        `<td class="c">${w.fuelNorm || 0}</td><td class="c">${w.fuelFact || 0}</td></tr>`,
    )
    .join('');

  const run = list.reduce((s, w) => s + Math.max(0, (w.odoIn || 0) - (w.odoOut || 0)), 0);
  const norm = list.reduce((s, w) => s + (w.fuelNorm || 0), 0);
  const fact = list.reduce((s, w) => s + (w.fuelFact || 0), 0);

  const html = `<table>
<tr><td class="t" colspan="11">СВОД ПУТЕВЫХ ЛИСТОВ · ${esc(title)}</td></tr>
<tr><th>№</th><th>Номер</th><th>Дата</th><th>Автомобиль</th><th>Водитель</th><th>Заказчик</th>
<th>Одометр выезд</th><th>Одометр возврат</th><th>Пробег, км</th><th>Норма, л</th><th>Факт, л</th></tr>
${rows || '<tr><td colspan="11" class="c">нет данных</td></tr>'}
<tr><td class="k" colspan="8">Итого</td><td class="c">${run}</td>
<td class="c">${norm.toFixed(1)}</td><td class="c">${fact.toFixed(1)}</td></tr>
</table>`;

  const book = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Свод</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>${STYLE}</style></head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + book], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Свод_путевых_${title.replace(/\s+/g, '_')}.xls`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
