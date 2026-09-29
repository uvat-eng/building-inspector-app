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
          <span className="font-semibold text-slate-800">stroykontrol-1.5.apk</span>
          <span className="text-sm text-slate-500">версия 1.5 · код версии 6 · 101 КБ</span>
        </div>
        <div className="mt-2 text-sm leading-relaxed text-slate-500">
          Подписан тем же сертификатом, что и прошлые версии, — обновление встанет поверх
          установленного приложения.
        </div>
        <a
          href="/rustore/stroykontrol-1.5.apk"
          download
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Icon name="Download" size={17} />
          Скачать APK для RuStore
        </a>
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
    </>
  );
};

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