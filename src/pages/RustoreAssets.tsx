import { Navigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { isApple } from '@/lib/platform';

interface Shot {
  file: string;
  title: string;
}

const SHOTS: Shot[] = [
  { file: 'screen-1-cabinet.png', title: 'Кабинет руководителя' },
  { file: 'screen-2-documents.png', title: 'Акты и документы' },
  { file: 'screen-3-map.png', title: 'Карта объектов' },
  { file: 'screen-4-tracker.png', title: 'Контроль перемещений' },
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