import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { isApple } from '@/lib/platform';

interface Shot {
  file: string;
  title: string;
}

const PERMISSIONS = [
  {
    name: 'INTERNET',
    title: 'Доступ в интернет',
    why: 'Вход в учётную запись, загрузка объектов и отправка актов на сервер компании.',
  },
  {
    name: 'ACCESS_NETWORK_STATE',
    title: 'Состояние сети',
    why: 'На объектах связь пропадает. Приложение проверяет соединение и ставит фотографии в очередь, чтобы дослать их при появлении сети.',
  },
  {
    name: 'ACCESS_FINE_LOCATION',
    title: 'Точное местоположение',
    why: 'Отметка, на каком объекте находится инспектор во время выезда, и маршрут рабочих перемещений. Только при открытом приложении и после согласия сотрудника.',
  },
  {
    name: 'ACCESS_COARSE_LOCATION',
    title: 'Приблизительное местоположение',
    why: 'Запасной вариант, когда спутники недоступны — например, внутри здания.',
  },
  {
    name: 'CAMERA',
    title: 'Камера',
    why: 'Фотофиксация выявленных нарушений на строительной площадке. Снимки прикладываются к акту осмотра.',
  },
  {
    name: 'RECORD_AUDIO',
    title: 'Микрофон',
    why: 'Необязательная голосовая диктовка замечаний: инспектор надиктовывает текст, когда неудобно печатать в перчатках. Аудиозапись не сохраняется и никуда не передаётся — остаётся только текст.',
  },
];

const REPLY = `Здравствуйте!

Благодарим за проверку. Разрешение REQUEST_INSTALL_PACKAGES исключено из сборки.

Оно присутствовало в ранней версии 1.3: приложение проверяло обновления и предлагало установить новую версию самостоятельно. Мы полностью отказались от этого механизма — обновления распространяются только через RuStore.

На модерацию направлена сборка версии 1.5 (versionCode 6). Полный перечень разрешений в ней:

1. INTERNET — вход в учётную запись и обмен данными с сервером компании.
2. ACCESS_NETWORK_STATE — проверка связи: на объектах интернет пропадает, приложение ставит фотографии в очередь и досылает их при появлении сети.
3. ACCESS_FINE_LOCATION — отметка объекта, на котором находится инспектор во время выезда, и маршрут рабочих перемещений. Сбор ведётся только при открытом приложении и только после согласия сотрудника.
4. ACCESS_COARSE_LOCATION — запасной вариант определения места, когда спутники недоступны.
5. CAMERA — фотофиксация нарушений на строительной площадке, снимки прикладываются к акту осмотра.
6. RECORD_AUDIO — необязательная голосовая диктовка текста замечания, когда неудобно печатать в перчатках. Распознавание выполняет встроенный в систему механизм, аудиозапись не сохраняется и не передаётся.

Разрешений на установку пакетов, работу с SMS, звонки, доступ к контактам и чтение файлов устройства в сборке нет.

Назначение приложения: рабочий инструмент строительного контроля для сотрудников ООО «Глобал-Стройинжиниринг». Учётные записи создаёт администратор организации, самостоятельная регистрация не предусмотрена.

ДОСТУП ДЛЯ ПРОВЕРКИ

На экране входа выберите любую должность, затем введите данные ниже. В поле «ФИО» логин вводится полностью, как указано.

Логин: admin
Пароль: 521456

Учётная запись администратора открывает все разделы приложения. Смена пароля при первом входе для неё отключена.

Просим рассмотреть сборку повторно.

С уважением,
ООО «Глобал-Стройинжиниринг»
uskov_an@mail.ru, 8 3452 90-12-44`;

const CheckBlock = () => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(REPLY).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => undefined,
    );
  };

  return (
    <>
      <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Файл для загрузки в RuStore
      </h2>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-semibold text-slate-800">stroykontrol-1.5.1.apk</span>
          <span className="text-sm text-slate-500">версия 1.5.1 · код версии 7 · 101 КБ</span>
        </div>
        <div className="mt-2 text-sm leading-relaxed text-slate-500">
          Подписан тем же сертификатом, что и прошлые версии, — обновление встанет поверх
          установленного приложения.
        </div>
        <a
          href="/rustore/stroykontrol-1.5.1.apk"
          download
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Icon name="Download" size={17} />
          Скачать APK для RuStore
        </a>
      </div>

      <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Доступ для модератора
      </h2>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm leading-relaxed text-slate-500">
          На экране входа выбрать любую должность, затем ввести данные. В поле «ФИО» — логин
          полностью.
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">Логин</div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-slate-800">admin</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">Пароль</div>
            <div className="mt-0.5 font-mono text-sm font-semibold text-slate-800">521456</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-500">
          Права администратора — открыты все разделы. Смена пароля при входе отключена.
        </div>
      </div>

      <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Разрешения в сборке
      </h2>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <b className="mb-1 block">Замечание модератора закрыто</b>
        Разрешение REQUEST_INSTALL_PACKAGES в сборке отсутствует — проверено разбором готового
        файла. В версии 1.5 также добавлен микрофон для голосовой диктовки замечаний.
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {PERMISSIONS.map((p) => (
          <div key={p.name} className="border-b border-slate-100 p-4 last:border-b-0">
            <div className="font-mono text-[0.82rem] font-semibold text-slate-800">{p.name}</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-700">{p.title}</div>
            <div className="mt-1 text-sm leading-relaxed text-slate-500">{p.why}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Ответ модератору
      </h2>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Icon name={copied ? 'Check' : 'Copy'} size={16} />
          {copied ? 'Скопировано' : 'Скопировать текст'}
        </button>
        <textarea
          readOnly
          value={REPLY}
          rows={18}
          className="mt-4 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[0.78rem] leading-relaxed text-slate-700"
        />
      </div>
      <ProductBlock />
    </>
  );
};

const PRODUCT_FIELDS: { label: string; value: string }[] = [
  { label: 'Название', value: 'Полный доступ' },
  {
    label: 'Описание',
    value:
      'Полная версия «Инспектор СК» для всей компании: без ограничений демо-режима по объектам, сотрудникам, проверкам, автомобилям и площадкам. Оплачивается один раз.',
  },
  { label: 'ProductID', value: 'inspector_sk_full' },
  { label: 'Тип товара', value: 'Непотребляемый' },
  { label: 'Цена', value: '90000' },
];

const CopyField = ({ label, value }: { label: string; value: string }) => {
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
        <div className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value}</div>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        }}
        className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
        aria-label="Скопировать"
      >
        <Icon name={done ? 'Check' : 'Copy'} size={15} />
      </button>
    </div>
  );
};

const ProductBlock = () => (
  <>
    <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
      Покупка «Полный доступ»
    </h2>
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-sm leading-relaxed text-slate-500">
        Разовая покупка, а не подписка: заводится в разделе «Монетизация → Товары».
        Компания платит один раз — и вся компания получает полную версию навсегда.
        Пробного периода нет, его роль играет демо-режим.
      </div>
      <div className="mt-4 grid gap-2">
        {PRODUCT_FIELDS.map((f) => (
          <CopyField key={f.label} label={f.label} value={f.value} />
        ))}
      </div>
      <div className="mt-4 text-sm leading-relaxed text-slate-500">
        Иконка — <a href="/rustore/icon-256.png" download className="text-primary underline">значок приложения 256×256</a>.
        Товар можно создать и опубликовать уже сейчас: кнопка
        оплаты появится в приложении следующим обновлением, после модерации версии 1.5.1.
      </div>
    </div>
  </>
);

const SHOTS: Shot[] = [
  { file: 'screen-1-cabinet.png', title: 'Мой кабинет' },
  { file: 'screen-2-documents.png', title: 'Акты и документы' },
  { file: 'screen-3-map.png', title: 'Главная — карта объектов' },
  { file: 'screen-4-tracker.png', title: 'Трекеры' },
  { file: 'screen-5-inspections.png', title: 'Проверки и выезды' },
  { file: 'screen-6-reports.png', title: 'Отчёты и статистика' },
];

// Служебная страница материалов для другого магазина.
// На технике Apple не открываем — правила App Store запрещают такие упоминания.
const RustoreAssets = () =>
  isApple() ? (
    <Navigate to="/" replace />
  ) : (
  <div className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
        Материалы для публикации в RuStore
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Приложение «Инспектор СК» · ООО «Глобал-Стройинжиниринг»
      </p>

      <CheckBlock />

      <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Иконка приложения
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-5 rounded-xl border border-slate-200 bg-white p-5">
        <img
          src="/rustore/icon-512.png"
          alt="Иконка приложения"
          className="h-32 w-32 rounded-3xl border border-slate-200"
        />
        <div>
          <div className="font-semibold text-slate-800">icon-512.png</div>
          <div className="mt-1 text-sm text-slate-500">
            512 × 512, PNG, без прозрачности
            <br />
            Формат соответствует требованиям RuStore
          </div>
          <a
            href="/rustore/icon-512.png"
            download
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Icon name="Download" size={16} />
            Скачать иконку
          </a>
        </div>
      </div>

      <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Скриншоты · 1080 × 1920
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {SHOTS.map((s) => (
          <div
            key={s.file}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-3"
          >
            <img
              src={`/rustore/${s.file}`}
              alt={s.title}
              loading="lazy"
              className="w-full rounded-md border border-slate-200"
            />
            <div className="mt-3 text-sm font-semibold text-slate-800">{s.title}</div>
            <div className="mb-3 text-xs text-slate-500">{s.file}</div>
            <a
              href={`/rustore/${s.file}`}
              download
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Icon name="Download" size={15} />
              Скачать
            </a>
          </div>
        ))}
      </div>

      <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Скачать всё одним архивом
      </h2>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-sm text-slate-500">
          Иконка и шесть скриншотов в одном файле — ZIP, около 2,3 МБ
        </div>
        <a
          href="/rustore/rustore-materials.zip"
          download
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Icon name="FileArchive" size={17} />
          Скачать архив
        </a>
        <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <b className="mb-1 block">Если файл не скачивается по клику</b>
          Нажмите на кнопку правой кнопкой мыши и выберите «Сохранить объект как». На
          телефоне — удерживайте палец на изображении и выберите «Сохранить».
        </div>
      </div>
    </div>
  </div>
  );

export default RustoreAssets;