import Icon from '@/components/ui/icon';

interface DeskHeaderProps {
  onStart: () => void;
  onMenu: () => void;
}

const DATE = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
}).format(new Date());

const DeskHeader = ({ onStart, onMenu }: DeskHeaderProps) => (
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
      <div className="flex items-baseline gap-3">
        <h1 className="font-head text-[26px] uppercase leading-[1.05] tracking-[-0.01em] sm:text-[38px]">
          Инспектор <span className="text-accent">технадзор</span>
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
        onClick={onStart}
        className="flex items-center gap-2 rounded-sm bg-accent px-4 py-3 font-head text-[0.9em] uppercase tracking-[0.06em] text-accent-foreground transition-opacity hover:opacity-90 sm:px-[26px]"
      >
        <Icon name="Mic" size={16} />
        <span className="hidden sm:inline">Начать проверку</span>
        <span className="sm:hidden">Проверка</span>
      </button>
    </div>
  </header>
);

export default DeskHeader;
