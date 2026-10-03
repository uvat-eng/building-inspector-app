import Icon from '@/components/ui/icon';

const PHONE = '8 3452 90-12-44';
const PHONE_TEL = '+73452901244';
const EMAIL = 'uskov_an@mail.ru';

const FAQ = [
  {
    q: 'Как начать работу?',
    a: 'На первом экране нажмите «Создать компанию»: укажите название, своё имя и пароль — рабочее пространство откроется сразу, с бесплатным демо-доступом. Сотрудники входят через «Войти по коду компании»: код и учётную запись им выдаёт руководитель.',
  },
  {
    q: 'Чем демо-доступ отличается от полного?',
    a: 'В демо-доступе открыты все разделы, но действуют лимиты: 2 объекта, 3 сотрудника, 10 актов осмотра, 2 единицы техники, 1 локация. Полный доступ снимает ограничения для всей компании — он оформляется разовой встроенной покупкой в приложении на iPhone или iPad. Если вы переустановили приложение, нажмите «Восстановить покупку».',
  },
  {
    q: 'Забыли пароль',
    a: 'Обратитесь к администратору или руководителю — он назначит новый пароль. По телефону или почте, указанным ниже, тоже помогут.',
  },
  {
    q: 'Не сохраняются фотографии замечаний',
    a: 'Снимки копятся в телефоне и уходят на сервер, когда появляется связь. В акте видно счётчик «в очереди» — нажмите на него, чтобы отправить сразу.',
  },
  {
    q: 'Зачем приложению геолокация',
    a: 'Для фиксации рабочих перемещений между объектами и подтверждения присутствия инспектора на площадке. Данные собираются только когда приложение открыто и только после вашего согласия.',
  },
  {
    q: 'Как удалить учётную запись',
    a: 'Боковое меню → внизу «Удалить учётную запись» → подтверждение. Также можно написать на почту или позвонить — запись и связанные с ней данные удалим в течение 30 дней.',
  },
];

const Support = () => (
  <div className="min-h-screen bg-background px-5 py-10">
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center text-center">
        <img src="/icon-512.png" alt="" className="h-20 w-20 rounded-sm" />
        <h1 className="mt-4 font-head text-[1.7em] uppercase leading-tight tracking-[0.04em] text-foreground">
          Поддержка
        </h1>
        <p className="mt-1.5 text-[0.9em] text-muted-foreground">
          Приложение «Инспектор СК»
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <a
          href={`tel:${PHONE_TEL}`}
          className="flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 transition-colors hover:border-accent"
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
            <Icon name="Phone" size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.72em] uppercase tracking-[0.12em] text-muted-foreground">
              Телефон
            </span>
            <span className="block font-head text-[1.05em] tracking-[0.02em] text-foreground">
              {PHONE}
            </span>
          </span>
        </a>

        <a
          href={`mailto:${EMAIL}`}
          className="flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 transition-colors hover:border-accent"
        >
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
            <Icon name="Mail" size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.72em] uppercase tracking-[0.12em] text-muted-foreground">
              Электронная почта
            </span>
            <span className="block truncate font-head text-[1.05em] tracking-[0.02em] text-foreground">
              {EMAIL}
            </span>
          </span>
        </a>
      </div>

      <p className="mt-3 text-center text-[0.85em] text-muted-foreground">
        Отвечаем в рабочие дни с 9:00 до 18:00 по тюменскому времени.
      </p>

      <h2 className="mt-9 border-b-2 border-accent pb-2 font-head text-[0.85em] uppercase tracking-[0.12em] text-foreground">
        Частые вопросы
      </h2>
      <div className="mt-4 space-y-3">
        {FAQ.map((f) => (
          <div key={f.q} className="rounded-sm border border-border bg-card px-4 py-3.5">
            <div className="flex gap-2.5">
              <Icon name="CircleHelp" size={17} className="mt-0.5 flex-none text-accent" />
              <div className="min-w-0">
                <div className="font-head text-[0.98em] tracking-[0.02em] text-foreground">
                  {f.q}
                </div>
                <p className="mt-1 text-[0.88em] leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-9 border-b-2 border-accent pb-2 font-head text-[0.85em] uppercase tracking-[0.12em] text-foreground">
        О приложении
      </h2>
      <div className="mt-4 rounded-sm border border-border bg-card px-4 py-4 text-[0.88em] leading-relaxed text-muted-foreground">
        <p>
          «Инспектор СК» — рабочее приложение для компаний строительного контроля:
          акты проверок, предписания, фотофиксация нарушений, табель и отчёты по
          объектам. Любая компания может зарегистрироваться прямо в приложении;
          данные каждой компании хранятся отдельно.
        </p>
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          <p>Разработчик: ООО «Глобал-Стройинжиниринг», г. Тюмень</p>
          <p>
            Телефон:{' '}
            <a href={`tel:${PHONE_TEL}`} className="text-accent hover:underline">
              {PHONE}
            </a>
          </p>
          <p>
            Почта:{' '}
            <a href={`mailto:${EMAIL}`} className="text-accent hover:underline">
              {EMAIL}
            </a>
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <a
          href="/privacy"
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-[0.85em] uppercase tracking-[0.06em] transition-colors hover:border-accent hover:text-accent"
        >
          <Icon name="FileText" size={15} />
          Политика конфиденциальности
        </a>
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-[0.85em] uppercase tracking-[0.06em] transition-colors hover:border-accent hover:text-accent"
        >
          <Icon name="ArrowLeft" size={15} />
          В приложение
        </a>
      </div>
    </div>
  </div>
);

export default Support;
