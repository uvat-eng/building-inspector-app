export type SectionId =
  | 'cabinet'
  | 'staff'
  | 'assets'
  | 'objects'
  | 'sites'
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
}

export const MENU: MenuItem[] = [
  { id: 'objects', label: 'Главная', short: 'Главная', icon: 'Map' },
  { id: 'cabinet', label: 'Мой кабинет', short: 'Кабинет инспектора', icon: 'IdCard' },
  { id: 'staff', label: 'Персонал', short: 'Персонал и учётные записи', icon: 'Users' },
  { id: 'assets', label: 'Техника и имущество', short: 'Техника, вагоны, приборы', icon: 'Package' },
  { id: 'sites', label: 'Объекты', short: 'Объекты строительства', icon: 'Building2' },
  { id: 'inspections', label: 'Проверки и выезды', short: 'Проверки и выезды', icon: 'ClipboardCheck' },
  { id: 'defects', label: 'Замечания', short: 'Замечания и дефекты', icon: 'TriangleAlert' },
  { id: 'photos', label: 'Фотоотчёты', short: 'Фотоотчёты', icon: 'Camera' },
  { id: 'documents', label: 'Акты и документы', short: 'Акты и документы', icon: 'FileSignature' },
  { id: 'reports', label: 'Отчёты', short: 'Отчёты и статистика', icon: 'ChartColumn' },
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

export const OBJECTS: SiteObject[] = [];

export interface Inspection {
  id: string;
  title: string;
  sub: string;
  time: string;
  object: string;
  status: 'today' | 'planned' | 'done';
  type: string;
}

export const INSPECTIONS: Inspection[] = [];

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

export const DEFECTS: Defect[] = [];

export interface Photo {
  id: string;
  title: string;
  meta: string;
  src: string;
  tag: string;
}

export const PHOTOS: Photo[] = [];

export interface Doc {
  id: string;
  title: string;
  sub: string;
  tag: string;
  tone: TagTone;
  unread?: boolean;
  kind: 'act' | 'order' | 'photo' | 'scheme';
}

export const DOCS: Doc[] = [];

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

export const VEHICLES: Vehicle[] = [];

export interface Inspector {
  id: string;
  name: string;
  role: string;
  project: string;
  hours: number;
  orders: number;
  closed: number;
}

export const INSPECTORS: Inspector[] = [];

export interface Request {
  id: string;
  title: string;
  who: string;
  tag: string;
  tone: TagTone;
}

export const REQUESTS: Request[] = [];

export interface Region {
  id: string;
  name: string;
  projects: number;
  inspectors: number;
  cars: number;
  load: number;
}

export const REGIONS: Region[] = [];

export const NORM_HINTS: { key: string[]; norm: string; text: string }[] = [
  { key: ['бетон', 'защитн', 'арматур'], norm: 'СП 70.13330.2012, п. 5.16.7', text: 'Толщина защитного слоя бетона не соответствует проекту' },
  { key: ['шов', 'сварк', 'сварн'], norm: 'СП 70.13330.2012, п. 10.4.3', text: 'Сварное соединение не имеет клейма сварщика' },
  { key: ['свая', 'свай'], norm: 'СП 45.13330.2017, п. 12.6', text: 'Отклонение отметки погружения сваи от проектной' },
  { key: ['огражд', 'котлован', 'охран'], norm: 'СП 48.13330.2019, п. 6.2.7', text: 'Не обеспечено ограждение опасной зоны' },
  { key: ['паспорт', 'документ', 'сертификат'], norm: 'СП 48.13330.2019, п. 7.1.3', text: 'Отсутствуют документы о качестве материалов' },
];