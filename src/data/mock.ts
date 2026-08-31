export type SectionId =
  | 'objects'
  | 'inspections'
  | 'defects'
  | 'photos'
  | 'documents'
  | 'reports';

export interface MenuItem {
  id: SectionId;
  label: string;
  short: string;
  icon: string;
  count: string;
}

export const MENU: MenuItem[] = [
  { id: 'objects', label: 'Объекты', short: 'Объекты строительства', icon: 'Building2', count: '12' },
  { id: 'inspections', label: 'Проверки и выезды', short: 'Проверки и выезды', icon: 'ClipboardCheck', count: '7' },
  { id: 'defects', label: 'Замечания', short: 'Замечания и дефекты', icon: 'TriangleAlert', count: '31' },
  { id: 'photos', label: 'Фотоотчёты', short: 'Фотоотчёты', icon: 'Camera', count: '148' },
  { id: 'documents', label: 'Акты и документы', short: 'Акты и документы', icon: 'FileSignature', count: '24' },
  { id: 'reports', label: 'Отчёты', short: 'Отчёты и статистика', icon: 'ChartColumn', count: '' },
];

export type TagTone = 'hot' | 'ok' | 'wait' | 'dim';

export interface SiteObject {
  id: string;
  title: string;
  sub: string;
  tag: string;
  tone: TagTone;
  unread?: boolean;
  region: string;
  customer: string;
  progress: number;
  deadline: string;
  inspector: string;
  openDefects: number;
}

export const OBJECTS: SiteObject[] = [
  {
    id: 'o1',
    title: 'ДНС-3, кустовая площадка 12',
    sub: 'Уватский р-н · СМР',
    tag: 'Выезд',
    tone: 'hot',
    unread: true,
    region: 'Тюменская область',
    customer: 'АО «Сибнефтепром»',
    progress: 62,
    deadline: '30.11.2026',
    inspector: 'А. Кузнецов',
    openDefects: 9,
  },
  {
    id: 'o2',
    title: 'Школа на 1200 мест, Тюмень',
    sub: 'Монолит, 4 этаж',
    tag: 'В графике',
    tone: 'ok',
    region: 'Тюмень',
    customer: 'ГКУ ТО «УКС»',
    progress: 48,
    deadline: '15.08.2027',
    inspector: 'М. Ерофеева',
    openDefects: 12,
  },
  {
    id: 'o3',
    title: 'Мост через Пышму',
    sub: 'Опоры 3–5',
    tag: 'Пауза',
    tone: 'wait',
    region: 'Тюменский р-н',
    customer: 'ФКУ «Уралуправтодор»',
    progress: 35,
    deadline: '01.06.2027',
    inspector: 'С. Гладков',
    openDefects: 7,
  },
  {
    id: 'o4',
    title: 'Котельная, п. Богандинский',
    sub: 'Пусконаладка',
    tag: 'Сдан',
    tone: 'dim',
    region: 'Тюменский р-н',
    customer: 'МУП «Тепло»',
    progress: 97,
    deadline: '20.09.2026',
    inspector: 'А. Кузнецов',
    openDefects: 3,
  },
  {
    id: 'o5',
    title: 'КНС-7, Ямбург',
    sub: 'Свайное поле',
    tag: 'Выезд',
    tone: 'hot',
    unread: true,
    region: 'ЯНАО',
    customer: 'ООО «Ямалстрой»',
    progress: 18,
    deadline: '10.04.2027',
    inspector: 'И. Петухов',
    openDefects: 5,
  },
  {
    id: 'o6',
    title: 'Резервуарный парк, Ноябрьск',
    sub: 'Монтаж РВС-5000',
    tag: 'В графике',
    tone: 'ok',
    region: 'ЯНАО',
    customer: 'АО «Сибнефтепром»',
    progress: 71,
    deadline: '05.12.2026',
    inspector: 'И. Петухов',
    openDefects: 4,
  },
];

export interface Inspection {
  id: string;
  title: string;
  sub: string;
  time: string;
  object: string;
  status: 'today' | 'planned' | 'done';
  type: string;
}

export const INSPECTIONS: Inspection[] = [
  { id: 'i1', title: 'Освидетельствование арматуры', sub: 'Школа · захватка 2', time: '09:30', object: 'Школа на 1200 мест', status: 'today', type: 'Скрытые работы' },
  { id: 'i2', title: 'Входной контроль труб', sub: 'ДНС-3 · партия 214', time: '12:00', object: 'ДНС-3', status: 'today', type: 'Входной контроль' },
  { id: 'i3', title: 'Геодезическая съёмка опор', sub: 'Мост · с подрядчиком', time: '15:00', object: 'Мост через Пышму', status: 'today', type: 'Геодезия' },
  { id: 'i4', title: 'Повторный осмотр кровли', sub: 'Котельная', time: '17:30', object: 'Котельная', status: 'today', type: 'Повторный осмотр' },
  { id: 'i5', title: 'Приёмка свайного поля', sub: 'КНС-7 · 1 сентября', time: '10:00', object: 'КНС-7, Ямбург', status: 'planned', type: 'Приёмка' },
  { id: 'i6', title: 'Контроль сварных стыков', sub: 'Резервуарный парк · 2 сентября', time: '11:30', object: 'Резервуарный парк', status: 'planned', type: 'Неразрушающий контроль' },
  { id: 'i7', title: 'Освидетельствование гидроизоляции', sub: 'Школа · выполнено', time: '30.08', object: 'Школа на 1200 мест', status: 'done', type: 'Скрытые работы' },
  { id: 'i8', title: 'Проверка узла 7', sub: 'ДНС-3 · выполнено', time: '29.08', object: 'ДНС-3', status: 'done', type: 'Повторный осмотр' },
];

export interface Defect {
  id: string;
  no: string;
  title: string;
  sub: string;
  tag: string;
  tone: TagTone;
  unread?: boolean;
  norm: string;
  object: string;
  fixed: boolean;
}

export const DEFECTS: Defect[] = [
  { id: 'd1', no: 'П-47/1', title: 'Защитный слой бетона 12 мм', sub: 'Школа · срок вчера', tag: 'Просрочено', tone: 'hot', unread: true, norm: 'СП 70.13330.2012, п. 5.16.7', object: 'Школа на 1200 мест', fixed: false },
  { id: 'd2', no: 'П-47/2', title: 'Сварной шов без клейма', sub: 'ДНС-3 · узел 7', tag: '3 дня', tone: 'wait', unread: true, norm: 'СП 70.13330.2012, п. 10.4.3', object: 'ДНС-3', fixed: false },
  { id: 'd3', no: 'П-51/1', title: 'Отклонение оси опоры 18 мм', sub: 'Мост', tag: '5 дней', tone: 'wait', norm: 'СП 46.13330.2012, п. 7.19', object: 'Мост через Пышму', fixed: false },
  { id: 'd4', no: 'П-39/4', title: 'Нет паспортов на утеплитель', sub: 'Котельная', tag: 'Устранено', tone: 'ok', norm: 'СП 48.13330.2019, п. 7.1.3', object: 'Котельная', fixed: true },
  { id: 'd5', no: 'П-52/1', title: 'Свая с недопогружением 40 мм', sub: 'КНС-7 · срок 3 дня', tag: 'В работе', tone: 'wait', norm: 'СП 45.13330.2017, п. 12.6', object: 'КНС-7, Ямбург', fixed: false },
  { id: 'd6', no: 'П-44/2', title: 'Отсутствует ограждение котлована', sub: 'ДНС-3 · охрана труда', tag: 'Просрочено', tone: 'hot', unread: true, norm: 'СП 48.13330.2019, п. 6.2.7', object: 'ДНС-3', fixed: false },
];

export interface Photo {
  id: string;
  title: string;
  meta: string;
  src: string;
  tag: string;
}

const PH1 = 'https://cdn.poehali.dev/projects/a297e31d-381c-4f9f-8cb5-d2ae794d3ee6/files/9c85718f-870a-4305-adb7-5f979b1255bd.jpg';
const PH2 = 'https://cdn.poehali.dev/projects/a297e31d-381c-4f9f-8cb5-d2ae794d3ee6/files/dacfc96f-f628-4838-a38d-7d5188055dd8.jpg';

export const PHOTOS: Photo[] = [
  { id: 'p1', title: 'Армирование плиты, захватка 2', meta: 'Школа · 31.08, 09:41 · GPS 57.15, 65.53', src: PH1, tag: 'К замечанию П-47/1' },
  { id: 'p2', title: 'Сварной стык, узел 7', meta: 'ДНС-3 · 30.08, 14:12 · GPS 59.13, 68.68', src: PH2, tag: 'К замечанию П-47/2' },
  { id: 'p3', title: 'Защитный слой, контрольный замер', meta: 'Школа · 31.08, 09:44', src: PH1, tag: 'Освидетельствование' },
  { id: 'p4', title: 'Партия труб 214, входной контроль', meta: 'ДНС-3 · 30.08, 12:03', src: PH2, tag: 'Входной контроль' },
  { id: 'p5', title: 'Опоры 3–5, общий вид', meta: 'Мост · 29.08, 16:20', src: PH1, tag: 'Фотоотчёт' },
  { id: 'p6', title: 'Изоляция стыков', meta: 'Резервуарный парк · 28.08, 11:07', src: PH2, tag: 'Фотоотчёт' },
];

export interface Doc {
  id: string;
  title: string;
  sub: string;
  tag: string;
  tone: TagTone;
  unread?: boolean;
  kind: 'act' | 'order' | 'photo' | 'scheme';
}

export const DOCS: Doc[] = [
  { id: 'a1', title: 'АОСР № 214 — армирование', sub: 'Школа · ждёт подписи', tag: 'Подписать', tone: 'hot', unread: true, kind: 'act' },
  { id: 'a2', title: 'Предписание № 47', sub: 'ДНС-3 · отправлено', tag: 'Отправлено', tone: 'dim', kind: 'order' },
  { id: 'a3', title: 'Фотоотчёт: опоры 3–5', sub: '28 снимков · привязка GPS', tag: 'Загружено', tone: 'ok', kind: 'photo' },
  { id: 'a4', title: 'Исполнительная схема кровли', sub: 'Котельная · проверка', tag: 'На проверке', tone: 'wait', kind: 'scheme' },
  { id: 'a5', title: 'АОСР № 215 — гидроизоляция', sub: 'Школа · подписан', tag: 'Подписан', tone: 'ok', kind: 'act' },
  { id: 'a6', title: 'Предписание № 52', sub: 'КНС-7 · черновик', tag: 'Черновик', tone: 'dim', kind: 'order' },
];

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  driver: string;
  fuel: string;
  service: string;
  waybills: number;
  status: 'На линии' | 'ТО' | 'Стоянка';
}

export const VEHICLES: Vehicle[] = [
  { id: 'v1', plate: 'Т 421 УК 72', model: 'УАЗ Патриот', driver: 'В. Сомов', fuel: '13,8 л/100 км', service: 'ТО-3 через 2 400 км', waybills: 21, status: 'На линии' },
  { id: 'v2', plate: 'Е 908 ВМ 72', model: 'Toyota Hilux', driver: 'Р. Гайнуллин', fuel: '11,2 л/100 км', service: 'ТО-2 через 800 км', waybills: 19, status: 'На линии' },
  { id: 'v3', plate: 'К 114 РС 89', model: 'ГАЗ Соболь 4х4', driver: 'Д. Лапшин', fuel: '15,4 л/100 км', service: 'На ТО до 02.09', waybills: 14, status: 'ТО' },
  { id: 'v4', plate: 'М 337 ОТ 89', model: 'УАЗ Профи', driver: 'не назначен', fuel: '14,1 л/100 км', service: 'ТО-1 через 5 100 км', waybills: 8, status: 'Стоянка' },
];

export interface Inspector {
  id: string;
  name: string;
  role: string;
  project: string;
  hours: number;
  orders: number;
  closed: number;
}

export const INSPECTORS: Inspector[] = [
  { id: 'n1', name: 'А. Кузнецов', role: 'Старший группы', project: 'ДНС-3 / Котельная', hours: 168, orders: 24, closed: 19 },
  { id: 'n2', name: 'М. Ерофеева', role: 'Инспектор', project: 'Школа на 1200 мест', hours: 152, orders: 17, closed: 14 },
  { id: 'n3', name: 'С. Гладков', role: 'Инспектор', project: 'Мост через Пышму', hours: 160, orders: 11, closed: 6 },
  { id: 'n4', name: 'И. Петухов', role: 'Старший группы', project: 'КНС-7 / Резервуарный парк', hours: 176, orders: 22, closed: 15 },
];

export interface Request {
  id: string;
  title: string;
  who: string;
  tag: string;
  tone: TagTone;
}

export const REQUESTS: Request[] = [
  { id: 'r1', title: 'Спецодежда зимняя, 4 комплекта', who: 'Группа ЯНАО · проживание', tag: 'Согласовано', tone: 'ok' },
  { id: 'r2', title: 'Тормозные колодки, УАЗ Патриот', who: 'В. Сомов · водитель', tag: 'В работе', tone: 'wait' },
  { id: 'r3', title: 'Топливная карта, лимит 500 л', who: 'Р. Гайнуллин · водитель', tag: 'Новая', tone: 'hot' },
  { id: 'r4', title: 'Толщиномер защитного слоя', who: 'М. Ерофеева · инспектор', tag: 'Отгружено', tone: 'dim' },
];

export const REGIONS = [
  { id: 'g1', name: 'Тюменская область', projects: 5, inspectors: 9, cars: 4, load: 78 },
  { id: 'g2', name: 'ЯНАО', projects: 4, inspectors: 7, cars: 3, load: 92 },
  { id: 'g3', name: 'ХМАО — Югра', projects: 2, inspectors: 4, cars: 2, load: 54 },
  { id: 'g4', name: 'Омская область', projects: 1, inspectors: 3, cars: 1, load: 31 },
];

export const NORM_HINTS: { key: string[]; norm: string; text: string }[] = [
  { key: ['бетон', 'защитн', 'арматур'], norm: 'СП 70.13330.2012, п. 5.16.7', text: 'Толщина защитного слоя бетона не соответствует проекту' },
  { key: ['шов', 'сварк', 'сварн'], norm: 'СП 70.13330.2012, п. 10.4.3', text: 'Сварное соединение не имеет клейма сварщика' },
  { key: ['свая', 'свай'], norm: 'СП 45.13330.2017, п. 12.6', text: 'Отклонение отметки погружения сваи от проектной' },
  { key: ['огражд', 'котлован', 'охран'], norm: 'СП 48.13330.2019, п. 6.2.7', text: 'Не обеспечено ограждение опасной зоны' },
  { key: ['паспорт', 'документ', 'сертификат'], norm: 'СП 48.13330.2019, п. 7.1.3', text: 'Отсутствуют документы о качестве материалов' },
];
