export interface District {
  id: string;
  name: string;
  short: string;
  label: [number, number];
  points: [number, number][];
}

export const MAP_W = 1000;
export const MAP_H = 430;

const LON_MIN = 26;
const LON_MAX = 186;
const LAT_MIN = 41;
const LAT_MAX = 78;

export const project = (lon: number, lat: number): [number, number] => [
  ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W,
  ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_H,
];

export const toPath = (points: [number, number][]) =>
  points
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';

export const RUSSIA: [number, number][] = [
  [28, 56], [28, 60], [31, 62], [29, 66], [29, 69], [33, 70], [41, 68],
  [44, 66], [45, 68], [52, 69], [58, 70], [66, 70], [69, 73], [73, 68],
  [76, 72], [83, 73], [88, 75], [95, 78], [102, 77], [108, 74], [113, 74],
  [120, 73], [130, 74], [140, 72], [150, 70], [160, 70], [170, 69], [180, 66],
  [178, 63], [172, 62], [166, 60], [163, 58], [160, 55], [157, 51], [159, 54],
  [161, 59], [155, 57], [150, 59], [143, 59], [140, 56], [138, 54], [141, 52],
  [140, 48], [135, 44], [131, 43], [130, 45], [127, 50], [120, 53], [116, 50],
  [108, 50], [98, 52], [89, 50], [85, 49], [80, 51], [76, 54], [70, 55],
  [62, 54], [56, 51], [50, 51], [47, 50], [40, 50], [38, 47], [37, 44],
  [40, 43], [47, 45], [48, 42], [45, 42], [39, 43], [36, 45], [34, 46],
  [32, 49], [30, 52], [30, 55],
];

export const DISTRICTS: District[] = [
  {
    id: 'nw',
    name: 'Северо-Западный ФО',
    short: 'СЗФО',
    label: [40, 64],
    points: [[26, 54], [26, 74], [50, 76], [56, 70], [52, 62], [46, 58], [36, 55]],
  },
  {
    id: 'c',
    name: 'Центральный ФО',
    short: 'ЦФО',
    label: [37, 54],
    points: [[28, 55], [36, 56], [45, 56], [46, 51], [41, 49], [33, 49], [28, 51]],
  },
  {
    id: 's',
    name: 'Южный ФО',
    short: 'ЮФО',
    label: [41, 47],
    points: [[30, 51], [41, 50], [48, 49], [49, 44], [40, 41], [31, 43]],
  },
  {
    id: 'nc',
    name: 'Северо-Кавказский ФО',
    short: 'СКФО',
    label: [44, 43],
    points: [[41, 45], [49, 46], [50, 41], [40, 41]],
  },
  {
    id: 'v',
    name: 'Приволжский ФО',
    short: 'ПФО',
    label: [50, 54],
    points: [[45, 58], [53, 59], [59, 58], [60, 51], [52, 48], [46, 49], [44, 53]],
  },
  {
    id: 'u',
    name: 'Уральский ФО',
    short: 'УФО',
    label: [68, 62],
    points: [[58, 52], [58, 60], [62, 68], [66, 76], [80, 78], [82, 68], [76, 58], [70, 51]],
  },
  {
    id: 'sib',
    name: 'Сибирский ФО',
    short: 'СФО',
    label: [93, 58],
    points: [[76, 50], [78, 60], [82, 70], [88, 79], [104, 79], [108, 68], [110, 56], [104, 48], [88, 47]],
  },
  {
    id: 'fe',
    name: 'Дальневосточный ФО',
    short: 'ДФО',
    label: [147, 55],
    points: [[108, 47], [108, 60], [106, 72], [112, 80], [186, 80], [186, 40], [130, 40]],
  },
];

export const YAKUTIA: [number, number][] = [
  [105, 71], [108, 73], [115, 74], [125, 73], [135, 73], [142, 71],
  [146, 68], [143, 63], [140, 60], [133, 57], [126, 55], [120, 56],
  [114, 58], [109, 61], [106, 65],
];

export interface RegionPoint {
  id: string;
  name: string;
  district: string;
  lon: number;
  lat: number;
}

export const REGION_POINTS: RegionPoint[] = [
  { id: 'yakutsk', name: 'Якутск', district: 'fe', lon: 129.7, lat: 62.0 },
  { id: 'mirny', name: 'Мирный (Якутия)', district: 'fe', lon: 113.9, lat: 62.5 },
  { id: 'lensk', name: 'Ленск (Якутия)', district: 'fe', lon: 114.9, lat: 60.7 },
  { id: 'aldan', name: 'Алдан (Якутия)', district: 'fe', lon: 125.4, lat: 58.6 },
  { id: 'neryungri', name: 'Нерюнгри (Якутия)', district: 'fe', lon: 124.7, lat: 56.7 },
  { id: 'tiksi', name: 'Тикси (Якутия)', district: 'fe', lon: 128.9, lat: 71.6 },
  { id: 'ust-kut', name: 'Усть-Кут', district: 'sib', lon: 105.8, lat: 56.8 },
  { id: 'vladivostok', name: 'Владивосток', district: 'fe', lon: 131.9, lat: 43.1 },
  { id: 'khabarovsk', name: 'Хабаровск', district: 'fe', lon: 135.1, lat: 48.5 },
  { id: 'blagoveshensk', name: 'Благовещенск', district: 'fe', lon: 127.5, lat: 50.3 },
  { id: 'magadan', name: 'Магадан', district: 'fe', lon: 150.8, lat: 59.6 },
  { id: 'irkutsk', name: 'Иркутск', district: 'sib', lon: 104.3, lat: 52.3 },
  { id: 'krasnoyarsk', name: 'Красноярск', district: 'sib', lon: 92.9, lat: 56.0 },
  { id: 'novosibirsk', name: 'Новосибирск', district: 'sib', lon: 82.9, lat: 55.0 },
  { id: 'norilsk', name: 'Норильск', district: 'sib', lon: 88.2, lat: 69.3 },
  { id: 'tyumen', name: 'Тюмень', district: 'u', lon: 65.5, lat: 57.2 },
  { id: 'surgut', name: 'Сургут', district: 'u', lon: 73.4, lat: 61.3 },
  { id: 'yamal', name: 'Новый Уренгой', district: 'u', lon: 76.7, lat: 66.1 },
  { id: 'ekb', name: 'Екатеринбург', district: 'u', lon: 60.6, lat: 56.8 },
  { id: 'kazan', name: 'Казань', district: 'v', lon: 49.1, lat: 55.8 },
  { id: 'ufa', name: 'Уфа', district: 'v', lon: 56.0, lat: 54.7 },
  { id: 'moscow', name: 'Москва', district: 'c', lon: 37.6, lat: 55.8 },
  { id: 'spb', name: 'Санкт-Петербург', district: 'nw', lon: 30.3, lat: 59.9 },
  { id: 'murmansk', name: 'Мурманск', district: 'nw', lon: 33.1, lat: 68.9 },
  { id: 'rostov', name: 'Ростов-на-Дону', district: 's', lon: 39.7, lat: 47.2 },
  { id: 'sochi', name: 'Сочи', district: 's', lon: 39.7, lat: 43.6 },
  { id: 'grozny', name: 'Грозный', district: 'nc', lon: 45.7, lat: 43.3 },
];
