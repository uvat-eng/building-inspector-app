import Icon from '@/components/ui/icon';

interface DeskHeaderProps {
  onLogin: () => void;
  onMenu: () => void;
}

const DATE = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
}).format(new Date());

const DeskHeader = ({ onLogin, onMenu }: DeskHeaderProps) => (
  <header className="flex h-[88px] flex-none items-center justify-between border-b border-border bg-card px-4 sm:px-[22px]">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Разделы"
        className="-ml-1 flex h-10 w-10 items-center justify-center rounded-sm text-primary transition-colors hover:bg-secondary lg:hidden"
      >
        <Icon name="Menu" size={22} />
      </button>
      <img
        src="/emblem.png"
        alt="Эмблема компании"
        className="h-10 w-10 flex-none object-contain sm:h-12 sm:w-12"
      />
      <div className="flex items-baseline gap-3">
        <h1 className="font-head text-[26px] leading-[1.05] tracking-[-0.01em] sm:text-[38px]">
          ИНСПЕКТОР <span className="text-accent">СК</span>
        </h1>
        <span className="hidden text-[0.85em] uppercase tracking-[0.14em] text-muted-foreground xl:inline">
          рабочий стол
        </span>
      </div>
    </div>
    <div className="flex items-center gap-4 sm:gap-[18px]">
      <span className="hidden text-[0.85em] uppercase tracking-[0.1em] text-muted-foreground md:inline">
        {DATE}
      </span>
      <button
        type="button"
        onClick={onLogin}
        className="flex items-center gap-2 rounded-sm bg-accent px-4 py-3 font-head text-[0.9em] uppercase tracking-[0.06em] text-accent-foreground transition-opacity hover:opacity-90 sm:px-[26px]"
      >
        <Icon name="LogIn" size={16} />
        <span className="hidden sm:inline">Войти в систему</span>
        <span className="sm:hidden">Войти</span>
      </button>
    </div>
  </header>
);

export default DeskHeader;