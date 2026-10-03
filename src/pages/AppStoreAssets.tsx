import { useState } from 'react';
import Icon from '@/components/ui/icon';

const SITE = 'https://инспектор.su';

const SHOTS = [
  { file: 'screen-1-cabinet.png', title: 'Мой кабинет' },
  { file: 'screen-2-documents.png', title: 'Акты и документы' },
  { file: 'screen-3-map.png', title: 'Главная — карта объектов' },
  { file: 'screen-4-tracker.png', title: 'Трекеры' },
  { file: 'screen-5-inspections.png', title: 'Проверки и выезды' },
  { file: 'screen-6-reports.png', title: 'Отчёты и статистика' },
];

const SUBTITLE = 'Контроль объектов и выездов';

const KEYWORDS =
  'стройконтроль,строительство,инспекция,объекты,акты,предписания,выезды,подрядчик,прораб,отчеты';

const DESCRIPTION = `«Инспектор СК» — рабочее приложение для компаний строительного контроля, технического надзора и генподрядчиков. Всё, что нужно инспектору на объекте и руководителю в офисе, — в одном месте.

НАЧАТЬ ПРОСТО

Зарегистрируйте свою компанию прямо в приложении: название, ваше имя и пароль. Рабочее пространство откроется сразу, с чистого листа. Добавьте объекты и сотрудников, передайте им код компании — и работайте вместе. Данные каждой компании хранятся отдельно и недоступны другим.

ВОЗМОЖНОСТИ

Мой кабинет. Рабочее место под должность: у инспектора — выезды и акты, у руководителя — сводка по всем проектам.

Объекты. Площадки по регионам с людьми, техникой и вагонами — план и факт рядом.

Проверки и выезды. Планирование осмотров, фиксация нарушений с фото, акты осмотра в Word.

Предписания. Выдача подрядчику, сроки и контроль устранения.

Фотоотчёты. Снимки с объектов, сгруппированные по месяцам.

Акты и документы. Переписка, протоколы и предписания по месяцам.

Трекеры. Маршруты выездов в рабочее время, пробег и время в движении.

Отчёты. Статистика по объектам и подрядчикам за период.

Персонал, техника и имущество. Сотрудники, автопарк, путевые листы, спецодежда и приборы.

ТАРИФЫ

Бесплатный демо-доступ: до 2 объектов, 3 сотрудников, 10 актов осмотра, 2 единиц техники и 1 локации. Все разделы открыты.

Полный доступ снимает все ограничения для всей компании и оформляется разовой встроенной покупкой.

ПРИВАТНОСТЬ

Геопозиция собирается только во время работы приложения и только после согласия сотрудника. Данные видит только руководство его компании. Рекламы и сторонней аналитики нет.`;

const REVIEW_NOTES = `«Инспектор СК» — приложение для любых компаний строительного контроля. Каждая компания регистрируется сама и работает в собственном изолированном пространстве.

КАК ПРОВЕРИТЬ (без логина и пароля)
1. Запустите приложение, примите условия конфиденциальности.
2. Нажмите «Создать компанию». Введите любое название (например, «Test LLC»), имя из двух слов (например, «Ivan Petrov») и пароль 1234. Откроется новое пустое рабочее пространство, вы — руководитель компании.
3. Вверху экрана — полоса «Демо-доступ» и кнопка «Полный доступ». Там встроенная покупка «Полный доступ» (inspector_sk_full) и кнопка «Восстановить покупку».
4. Демо-ограничения: 2 объекта, 3 сотрудника, 10 актов, 2 единицы техники, 1 локация. При превышении лимита приложение предлагает полный доступ.

ДЕМО-КОМПАНИЯ С ЗАПОЛНЕННЫМИ ДАННЫМИ (по желанию)
На первом экране нажмите «ООО «Глобал-Стройинжиниринг»» — это наш первый клиент, подключённый к приложению. В поле «ФИО» введите логин полностью:
Руководитель — Demo Manager / Demo2026!
Инспектор — Demo Inspector / Demo2026!

ВХОД СОТРУДНИКОВ
Руководитель видит код компании; сотрудник выбирает «Войти по коду компании» и входит под учётной записью, созданной руководителем.

УДАЛЕНИЕ УЧЁТНОЙ ЗАПИСИ
Боковое меню → внизу «Удалить учётную запись» → подтверждение.

ДАННЫЕ И РАЗРЕШЕНИЯ
Геопозиция — только пока приложение открыто и после согласия сотрудника; видит только руководство его компании. Отслеживания (tracking) нет: нет рекламы, сторонней аналитики, рекламного идентификатора. Камера — фото нарушений. Микрофон — необязательная голосовая диктовка через встроенное распознавание речи системы; аудио не сохраняется.
Политика конфиденциальности: ${SITE}/privacy

Контакт: uskov_an@mail.ru, 8 3452 90-12-44`;

/** Ответ проверяющему на письмо от 1 октября 2026 (Guideline 5.1.2(i) и 3.2). */
const REJECTION_REPLY_OCT = `Hello,

Thank you for your review. We have resolved both issues in version 1.4 (build 6) and request public distribution on the App Store.

GUIDELINE 3.2 – BUSINESS

The app is no longer limited to one organization. Inspector SK is now a general-purpose app for any construction supervision company, technical inspection company or general contractor.

- Anyone can register their own company directly in the app: on the first screen tap "Создать компанию" (Create company), enter a company name, a full name and a password. A new, empty workspace opens immediately — no credentials from us are needed.
- Each company's data is fully isolated from all other companies.
- Every new company starts with a free demo (up to 2 sites, 3 employees, 10 inspection reports). The full version for the whole company is unlocked with a one-time In-App Purchase "Full access" (product ID: inspector_sk_full). "Restore purchase" is available in the same window.
- A company manager invites employees with a company code; employees choose "Войти по коду компании" (Join by company code).
- Global-Stroyinzhiniring LLC is simply our first customer. Its button on the first screen is a shortcut for its staff and lets you see a workspace filled with real data.

How to review without any credentials:
1. Launch the app and accept the privacy notice.
2. Tap "Создать компанию". Enter any company name (e.g. "Test LLC"), any two-word name (e.g. "Ivan Petrov") and password 1234.
3. You are now the manager of a new, empty company. Tap "Полный доступ" (Full access) at the top of the screen to see the In-App Purchase.

Optional – a company with sample data: tap "ООО «Глобал-Стройинжиниринг»" on the first screen and sign in with Demo Manager / Demo2026! (login is typed into the "ФИО" field).

GUIDELINE 5.1.2(i) – DATA USE AND SHARING

The app does not track users. It has no advertising, no third-party analytics or advertising SDKs, does not access the advertising identifier (IDFA) and does not share data with data brokers. Location is collected only while the app is in use, after the employee's consent, so that the managers of the employee's own company can see which construction site they are working at. It is stored on our servers and is never combined with third-party data or used for advertising.

"Used to Track You" had been selected in App Privacy by mistake. We have corrected it: all data types, including Precise Location, are now marked "App Functionality" and "Not Used to Track You". App Tracking Transparency is therefore not required.

Thank you,
Global-Stroyinzhiniring LLC`;

/** Встроенная покупка — что завести в App Store Connect. */
const IAP_SETUP = `Тип: Non-Consumable (непотребляемая, разовая)
Product ID: inspector_sk_full
Reference Name: Полный доступ
Отображаемое название (рус.): Полный доступ
Описание (рус.): Снимает ограничения демо-доступа для всей компании
Цена: на ваше усмотрение`;

/** Примечание к проверке встроенной покупки (поле «Примечания к проверке»). */
const IAP_REVIEW_NOTES = `Non-consumable purchase "Full access" (product ID: inspector_sk_full) unlocks the full version of the app for the user's whole company. It removes the limits of the free demo: 2 sites, 3 employees, 10 inspection reports, 2 vehicles and 1 location.

How to find it:
1. Launch the app and accept the privacy notice.
2. Tap "Создать компанию" (Create company). Enter any company name (e.g. "Test LLC"), any two-word name (e.g. "Ivan Petrov") and password 1234.
3. A new company on the free demo opens. Tap "Полный доступ" (Full access) in the orange bar at the top of the screen.
4. The purchase window shows the demo usage and the buttons "Купить" (Buy) and "Восстановить покупку" (Restore purchase).

After a successful purchase the server verifies the signed App Store transaction and removes the limits immediately. The purchase is restored with "Восстановить покупку".`;

/** Тексты запросов доступа. Apple отклоняет сборку, если их нет в Info.plist. */
const PERMISSION_STRINGS = `NSLocationWhenInUseUsageDescription
Приложение отмечает, на каком объекте находится инспектор во время выезда. Данные видит только руководство вашей компании.

NSCameraUsageDescription
Камера нужна для фотофиксации выявленных замечаний на строительном объекте.

NSPhotoLibraryUsageDescription
Доступ к фотографиям нужен, чтобы приложить ранее сделанные снимки объекта к акту осмотра.

NSMicrophoneUsageDescription
Микрофон нужен для голосовой диктовки текста замечания, когда неудобно печатать вручную. Аудиозапись не сохраняется.

NSSpeechRecognitionUsageDescription
Распознавание речи переводит надиктованное замечание в текст акта. Запись голоса не сохраняется и не передаётся.`;

type Block = { label: string; value: string; hint?: string; rows?: number };

const BLOCKS: Block[] = [
  { label: 'Название', value: 'Инспектор СК', hint: 'до 30 символов' },
  { label: 'Подзаголовок', value: SUBTITLE, hint: 'до 30 символов' },
  { label: 'Ключевые слова', value: KEYWORDS, hint: 'до 100 символов, через запятую' },
  { label: 'Описание', value: DESCRIPTION, hint: 'до 4000 символов', rows: 14 },
  { label: 'Что нового', value: 'Регистрация своей компании прямо в приложении, бесплатный демо-доступ и полный доступ встроенной покупкой. Печать документов на iPhone и iPad.', hint: 'для версии 1.4' },
  { label: 'Заметка для проверяющего', value: REVIEW_NOTES, hint: 'App Review Information → Notes', rows: 14 },
  {
    label: 'Тексты запросов доступа',
    value: PERMISSION_STRINGS,
    hint: 'Info.plist — обязательны, иначе отклонят',
    rows: 12,
  },
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
        Приложение «Инспектор СК» · публичная версия для любых компаний
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

      <Section title="Скриншоты для iPad · 2048 × 2732">
        <p className="mt-3 text-sm text-slate-500">
          Вкладка «iPad» → слот 12,9-дюймового дисплея. Нужны, только если
          приложение заявлено для iPad.
        </p>
        <ShotGrid folder="ipad-screens" />
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
            {
              name: 'Политика конфиденциальности',
              url: 'https://xn--e1afhkhdkdm.su/privacy',
            },
            {
              name: 'URL службы поддержки',
              url: 'https://xn--e1afhkhdkdm.su/support',
            },
            {
              name: 'Маркетинговая страница (необязательно)',
              url: 'https://xn--e1afhkhdkdm.su/app',
            },
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

      <Section title="Конфиденциальность приложения">
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          Сейчас в карточке указано «сбор данных не ведётся» — это неверно.
          Приложение собирает геопозицию и данные сотрудников. Оставите как есть —
          приложение отклонят.
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="font-semibold text-slate-800">Шаг 1 · Ссылка на политику</div>
          <p className="mt-1 text-sm text-slate-500">
            Поле «Политика конфиденциальности (URL)». Вставьте адрес в этом виде —
            кириллический App Store Connect часто не принимает.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
            <code className="break-all text-sm text-slate-700">
              https://xn--e1afhkhdkdm.su/privacy
            </code>
            <CopyBtn text="https://xn--e1afhkhdkdm.su/privacy" />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Второе поле «URL-адрес параметров конфиденциальности» — необязательное,
            оставьте пустым.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="font-semibold text-slate-800">Шаг 2 · Типы данных</div>
          <p className="mt-1 text-sm text-slate-500">
            Нажмите «Редактировать» рядом с «Типы данных» и отметьте три пункта.
            Для каждого ответы одинаковые.
          </p>
          <div className="mt-4 space-y-3">
            {[
              {
                name: 'Геопозиция → Точная геопозиция',
                why: 'Фиксация рабочих перемещений инспекторов между объектами',
              },
              {
                name: 'Контактные данные → Имя, Номер телефона',
                why: 'Учётная запись сотрудника и подписание документов',
              },
              {
                name: 'Идентификаторы → Идентификатор пользователя',
                why: 'Привязка актов и табеля к сотруднику',
              },
            ].map((d) => (
              <div key={d.name} className="rounded-lg border border-slate-200 p-3">
                <div className="text-sm font-semibold text-slate-800">{d.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{d.why}</div>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li>
                    Цель — <b>Функциональность приложения</b>
                  </li>
                  <li>
                    Связаны с личностью пользователя — <b>Да</b>
                  </li>
                  <li>
                    Используются для отслеживания — <b>Нет</b>
                  </li>
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Реклама, аналитика, персонализация, история поиска, покупки, контакты,
            фото из галереи — не отмечайте.
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="font-semibold text-slate-800">Шаг 3 · Публикация</div>
          <p className="mt-1 text-sm text-slate-500">
            Нажмите «Опубликовать» в правом верхнем углу раздела. Без этого анкета
            не сохранится и проверка не запустится.
          </p>
        </div>
      </Section>

      <Section title="Что сделать сейчас: ответ на письмо Apple от 1 октября">
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">
          Приложение публикуется <b>в открытом доступе</b>: его можно найти в поиске
          App Store и скачать как обычно. Ни в одном тексте ниже нет просьбы о
          скрытом распространении — наоборот, мы прямо пишем, что просим публичное.
        </div>
        <ol className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
          <li>
            <b className="text-slate-800">1. Опубликовать сайт</b> на poehali.dev — чтобы
            заработали регистрация компаний и покупка.
          </li>
          <li>
            <b className="text-slate-800">2. Собрать сборку 1.4 (6)</b>: GitHub → Actions →
            «Сборка для iPhone» → Run workflow → режим <b>testflight</b>. Дождаться, пока
            сборка появится в App Store Connect → TestFlight (обычно 15–30 минут).
          </li>
          <li>
            <b className="text-slate-800">3. Соглашение о платных приложениях.</b> App Store
            Connect → «Бизнес» → «Соглашения» → Paid Apps: принять и заполнить
            банковские и налоговые данные. Без этого встроенная покупка не заработает.
          </li>
          <li>
            <b className="text-slate-800">4. Встроенная покупка.</b> Приложение →
            «Монетизация» → «Встроенные покупки» → «+» → заполнить по карточке ниже →
            сохранить, приложить скриншот окна «Полный доступ».
          </li>
          <li>
            <b className="text-slate-800">5. Конфиденциальность.</b> Приложение →
            «Конфиденциальность приложения» → у каждого типа данных (включая «Точная
            геопозиция») ответить «Нет» на «Используется для отслеживания» →
            «Опубликовать».
          </li>
          <li>
            <b className="text-slate-800">6. Распространение.</b> «Цены и доступность» →
            «Публичный» (Public). Если там стоит другое — переключить.
          </li>
          <li>
            <b className="text-slate-800">7. Версия 1.4.</b> Заменить в карточке
            «Описание», «Что нового» и «Заметку для проверяющего» новыми текстами из
            раздела «Тексты карточки» выше. В блоке «Сборка» выбрать сборку 6. В блоке
            «Встроенные покупки и подписки» добавить «Полный доступ».
          </li>
          <li>
            <b className="text-slate-800">8. Ответ проверяющему.</b> «Центр
            приложений» → переписка App Review по этой заявке → вставить ответ ниже →
            отправить. Затем «Отправить на проверку».
          </li>
        </ol>
        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start">
          <img
            src="/iap-review-screenshot.png"
            alt="Окно покупки полного доступа"
            className="w-40 flex-none rounded-lg border border-slate-200"
          />
          <div className="text-sm leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-800">
              Встроенная покупка — «Снимок экрана» (1284 × 2778)
            </p>
            <p className="mt-1">
              Окно «Полный доступ» с кнопками «Купить» и «Восстановить покупку». Размер
              подходит Apple. Скачайте и загрузите в поле «Снимок экрана» на странице
              покупки.
            </p>
            <a
              href="/iap-review-screenshot.png"
              download="iap-review-screenshot.png"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              <Icon name="Download" size={14} />
              Скачать снимок
            </a>
          </div>
        </div>
        {[
          { title: 'Ответ проверяющему (Reply to App Review)', text: REJECTION_REPLY_OCT, rows: 22 },
          { title: 'Встроенная покупка — карточка', text: IAP_SETUP, rows: 7 },
          { title: 'Встроенная покупка — «Примечания к проверке»', text: IAP_REVIEW_NOTES, rows: 14 },
        ].map((b) => (
          <div key={b.title} className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-800">{b.title}</span>
              <CopyBtn text={b.text} />
            </div>
            <textarea
              readOnly
              rows={b.rows}
              value={b.text}
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700"
            />
          </div>
        ))}
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
            <span className="font-semibold text-slate-800">Доступ для проверки.</span>{' '}
            В поле «Требуется вход» отметьте «Да» и укажите Demo Manager / Demo2026! —
            это на случай, если проверяющий захочет посмотреть компанию с данными.
            Основной путь проверки — «Создать компанию», логин для него не нужен.
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