import { useState } from 'react';
import Icon from '@/components/ui/icon';

const SITE = 'https://инспектор.su';

const SHOTS = [
  { file: 'screen-1-cabinet.png', title: 'Кабинет руководителя' },
  { file: 'screen-2-documents.png', title: 'Акты и документы' },
  { file: 'screen-3-map.png', title: 'Карта объектов' },
  { file: 'screen-4-tracker.png', title: 'Контроль перемещений' },
  { file: 'screen-5-inspections.png', title: 'Проверки и выезды' },
  { file: 'screen-6-reports.png', title: 'Отчёты и статистика' },
];

const SUBTITLE = 'Контроль объектов и выездов';

const KEYWORDS =
  'стройконтроль,строительство,инспекция,объекты,акты,предписания,выезды,подрядчик,прораб,отчеты';

const DESCRIPTION = `«Инспектор СК» — рабочий инструмент строительного контроля для сотрудников ООО «Глобал-Стройинжиниринг». Приложение собирает в одном месте всё, что нужно инспектору на объекте и руководителю в офисе.

ВОЗМОЖНОСТИ

Кабинет руководителя. Сводка по проектам, объектам и инспекторам на вахте. Количество открытых предписаний видно сразу при входе.

Объекты и локации. Список проектов по регионам с разбивкой по людям, технике и вагонам — план и факт рядом.

Акты и документы. Переписка, протоколы и предписания по месяцам. Пункты, ответы и статусы выполнения хранятся вместе.

Карта объектов. Расположение площадок с привязкой к проектам.

Контроль перемещений. Маршруты выездов в рабочее время, пробег и время в движении.

Проверки и выезды. Планирование инспекций, фиксация нарушений, контроль сроков устранения.

Отчёты. Статистика по объектам и подрядчикам за период.

ДОСТУП

Приложение предназначено для сотрудников организации. Учётные записи создаёт администратор компании. Регистрация через приложение не предусмотрена — данные для входа выдаёт работодатель.

Каждой должности доступны свои разделы: инспектор работает с выездами и актами, руководитель видит сводку по всем проектам.

Сбор данных о перемещениях ведётся только в рабочее время и только после согласия сотрудника при входе.`;

const REVIEW_NOTES = `Приложение предназначено для внутреннего использования сотрудниками ООО «Глобал-Стройинжиниринг» (строительный контроль). Регистрация самостоятельная не предусмотрена — учётные записи создаёт администратор организации.

Для проверки созданы две демонстрационные учётные записи. В поле «ФИО» на экране входа введите логин полностью, как указано ниже.

1) Руководитель проекта — полный доступ ко всем разделам
Логин: Demo Manager
Пароль: Demo2026!

2) Инспектор строительного контроля — выезды, акты, фотофиксация
Логин: Demo Inspector
Пароль: Demo2026!

Смена пароля при первом входе для этих записей отключена. Обе записи открывают рабочие данные по объектам в Якутии.

Геолокация используется для фиксации рабочих перемещений инспекторов между строительными объектами. Данные собираются только когда приложение открыто и только после явного согласия сотрудника. Политика конфиденциальности: ${SITE}/privacy

Контакт для связи: uskov_an@mail.ru, 8 3452 90-12-44`;

type Block = { label: string; value: string; hint?: string; rows?: number };

const BLOCKS: Block[] = [
  { label: 'Название', value: 'Инспектор СК', hint: 'до 30 символов' },
  { label: 'Подзаголовок', value: SUBTITLE, hint: 'до 30 символов' },
  { label: 'Ключевые слова', value: KEYWORDS, hint: 'до 100 символов, через запятую' },
  { label: 'Описание', value: DESCRIPTION, hint: 'до 4000 символов', rows: 14 },
  { label: 'Что нового', value: 'Первая версия приложения.', hint: 'для версии 1.4' },
  { label: 'Заметка для проверяющего', value: REVIEW_NOTES, hint: 'App Review Information', rows: 10 },
];

const CopyBtn = ({ text }: { text: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
    >
      <Icon name={done ? 'Check' : 'Copy'} size={13} />
      {done ? 'Скопировано' : 'Копировать'}
    </button>
  );
};

const ShotGrid = ({ folder }: { folder: string }) => (
  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
    {SHOTS.map((s) => (
      <div
        key={s.file}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <img
          src={`/${folder}/${s.file}`}
          alt={s.title}
          className="w-full border-b border-slate-100"
        />
        <div className="p-2.5">
          <div className="text-xs font-semibold leading-tight text-slate-700">
            {s.title}
          </div>
          <a
            href={`/${folder}/${s.file}`}
            download
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Icon name="Download" size={12} />
            Скачать
          </a>
        </div>
      </div>
    ))}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <>
    <h2 className="mt-9 border-b-2 border-primary pb-2 text-sm font-semibold uppercase tracking-wide text-slate-700">
      {title}
    </h2>
    {children}
  </>
);

const AppStoreAssets = () => (
  <div className="min-h-screen bg-slate-50 px-4 py-8">
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
        Материалы для публикации в App Store
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Приложение «Инспектор СК» · ООО «Глобал-Стройинжиниринг»
      </p>

      <Section title="Иконка · 1024 × 1024">
        <div className="mt-4 flex flex-wrap items-center gap-5 rounded-xl border border-slate-200 bg-white p-5">
          <img
            src="/ios-icon-1024.png"
            alt="Иконка приложения"
            className="h-32 w-32 rounded-3xl border border-slate-200"
          />
          <div>
            <div className="font-semibold text-slate-800">ios-icon-1024.png</div>
            <div className="mt-1 text-sm text-slate-500">
              1024 × 1024, PNG, белый фон, без прозрачности
              <br />
              Уже встроена в сборку — загружать отдельно не нужно
            </div>
            <a
              href="/ios-icon-1024.png"
              download
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Icon name="Download" size={16} />
              Скачать иконку
            </a>
          </div>
        </div>
      </Section>

      <Section title="Скриншоты · 6,5″ · 1284 × 2778">
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Этот набор подходит в слот «6,5-дюймовый дисплей» — тот, что подсвечен
          красным в вашей карточке. Загружайте именно его.
        </div>
        <ShotGrid folder="ios-screens-65" />
      </Section>

      <Section title="Скриншоты · 6,7″ · 1290 × 2796">
        <p className="mt-3 text-sm text-slate-500">
          Запасной набор для слота «6,7-дюймовый дисплей». Если такого слота нет —
          пропустите.
        </p>
        <ShotGrid folder="ios-screens" />
      </Section>

      <Section title="Тексты карточки">
        <div className="mt-4 space-y-4">
          {BLOCKS.map((b) => (
            <div key={b.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-800">{b.label}</span>
                  {b.hint && (
                    <span className="ml-2 text-xs text-slate-400">{b.hint}</span>
                  )}
                </div>
                <CopyBtn text={b.value} />
              </div>
              <pre className="mt-2.5 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm leading-relaxed text-slate-600">
                {b.value}
              </pre>
              <div className="mt-1.5 text-right text-xs text-slate-400">
                {b.value.length} символов
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Прямые ссылки">
        <div className="mt-4 space-y-2">
          {[
            { name: 'Политика конфиденциальности', url: `${SITE}/privacy` },
            { name: 'Страница поддержки', url: SITE },
            { name: 'Маркетинговая страница', url: `${SITE}/app` },
          ].map((l) => (
            <div
              key={l.url}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-800">{l.name}</div>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm text-primary hover:underline"
                >
                  {l.url}
                </a>
              </div>
              <CopyBtn text={l.url} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Ответы на вопросы Apple">
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">Экспортное шифрование.</span>{' '}
            Приложение не использует нестандартное шифрование — отвечайте «Нет».
            Обычного HTTPS это не касается.
          </p>
          <p>
            <span className="font-semibold text-slate-800">Возрастной рейтинг.</span>{' '}
            На все вопросы анкеты отвечайте «Нет» — получится 4+.
          </p>
          <p>
            <span className="font-semibold text-slate-800">Категория.</span> Основная
            — «Бизнес», дополнительная — «Производительность».
          </p>
          <p>
            <span className="font-semibold text-slate-800">Сбор данных.</span> В
            анкете конфиденциальности отметьте: геопозиция (привязана к личности,
            для работы приложения), контактные данные, идентификаторы. Реклама и
            отслеживание — не используются.
          </p>
          <p>
            <span className="font-semibold text-slate-800">Доступ для проверки.</span>{' '}
            Обязательно укажите демонстрационный логин и пароль в заметке для
            проверяющего, иначе приложение отклонят на первом же шаге.
          </p>
        </div>
      </Section>

      <Section title="Демонстрационные учётные записи">
        <p className="mt-3 text-sm text-slate-500">
          Созданы и проверены — вход работает, смена пароля при первом входе
          отключена. Логин вводится в поле «ФИО» на экране входа.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              role: 'Руководитель проекта',
              note: 'Полный доступ ко всем разделам',
              login: 'Demo Manager',
            },
            {
              role: 'Инспектор СК',
              note: 'Выезды, акты, фотофиксация',
              login: 'Demo Inspector',
            },
          ].map((a) => (
            <div key={a.login} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-800">{a.role}</div>
              <div className="mt-0.5 text-xs text-slate-500">{a.note}</div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Логин</dt>
                  <dd className="font-mono font-semibold text-slate-800">{a.login}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Пароль</dt>
                  <dd className="font-mono font-semibold text-slate-800">Demo2026!</dd>
                </div>
              </dl>
              <div className="mt-3">
                <CopyBtn text={`Логин: ${a.login}\nПароль: Demo2026!`} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <div className="flex items-start gap-2.5">
          <Icon name="TriangleAlert" size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Не удаляйте эти учётные записи</div>
            <p className="mt-1.5">
              Пока приложение на проверке, записи Demo Manager и Demo Inspector
              должны оставаться рабочими. Если их удалить, проверяющий не сможет
              войти и отклонит заявку.
            </p>
          </div>
        </div>
      </div>

      <a
        href="/"
        className="mt-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <Icon name="ArrowLeft" size={15} />
        На главную
      </a>
    </div>
  </div>
);

export default AppStoreAssets;