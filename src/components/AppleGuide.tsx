import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    icon: 'Share',
    title: 'Нажмите «Поделиться»',
    text: 'Кнопка со стрелкой вверх в нижней панели браузера.',
  },
  {
    icon: 'SquarePlus',
    title: 'Выберите «На экран „Домой“»',
    text: 'Пункт в списке действий. Подтвердите название и нажмите «Добавить».',
  },
  {
    icon: 'CircleCheck',
    title: 'Готово',
    text: 'Значок появится на экране. Приложение открывается на весь экран, как обычное.',
  },
];

/**
 * Экран установки для техники Apple.
 * Никаких упоминаний других платформ и сторонних установочных файлов —
 * этого требуют правила App Store.
 */
const AppleGuide = () => (
  <div className="min-h-screen bg-background px-5 py-10">
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center text-center">
        <img src="/icon-512.png" alt="" className="h-20 w-20 rounded-sm" />
        <h1 className="mt-4 font-head text-[1.7em] uppercase leading-tight tracking-[0.04em] text-foreground">
          Стройконтроль
        </h1>
        <span className="mt-2 block h-[3px] w-[90px] rounded-full bg-accent" />
        <p className="mt-3 max-w-md text-[0.9em] leading-relaxed text-muted-foreground">
          Рабочее приложение для сотрудников ООО «Глобал-Стройинжиниринг».
          Объекты, проверки, замечания и фотоотчёты — в телефоне.
        </p>
      </div>

      <Button
        asChild
        className="mt-8 w-full gap-2 rounded-sm bg-accent py-6 font-head text-[1em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <a href="/">
          <Icon name="LogIn" size={18} />
          Открыть приложение
        </a>
      </Button>

      <div className="mt-8 rounded-sm border border-border bg-card p-5">
        <p className="font-head text-[0.95em] uppercase tracking-[0.05em] text-foreground">
          Чтобы открывать с экрана телефона
        </p>
        <div className="mt-4 space-y-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3">
              <div className="flex h-9 w-9 flex-none items-center justify-center rounded-sm border border-border bg-background">
                <Icon name={s.icon} size={17} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1 leading-snug">
                <p className="text-[0.9em] text-foreground">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-0.5 text-[0.82em] text-muted-foreground">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[0.8em] text-muted-foreground">
        <a href="/privacy" className="transition-colors hover:text-accent">
          Политика конфиденциальности
        </a>
        <a href="/support" className="transition-colors hover:text-accent">
          Поддержка
        </a>
      </div>

      <p className="mt-6 text-center text-[0.76em] text-muted-foreground">
        Учётные записи выдаёт администратор организации.
      </p>
    </div>
  </div>
);

export default AppleGuide;
