import { cn } from '@/lib/utils';
import Icon from '@/components/ui/icon';
import { MENU, SectionId } from '@/data/mock';

interface SideMenuProps {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  className?: string;
}

const SideMenu = ({ active, onSelect, className }: SideMenuProps) => (
  <nav
    className={cn(
      'flex min-h-0 flex-col rounded-sm bg-deep py-[18px] pb-3.5',
      className,
    )}
  >
    <div className="px-[18px] pb-3.5 text-[0.72em] uppercase tracking-[0.18em] text-deep-dim">
      Разделы
    </div>
    <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      {MENU.map((item) => {
        const on = item.id === active;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex w-full items-center gap-2.5 border-l-[3px] border-transparent px-[18px] py-[11px] text-left text-[0.95em] text-deep-foreground transition-colors',
                on
                  ? 'border-l-accent bg-deep-2 font-bold'
                  : 'hover:bg-deep-2/60',
              )}
            >
              <Icon name={item.icon} size={16} className="flex-none text-accent" />
              <span className="truncate">{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
    <div className="mt-auto border-t border-white/10 px-[18px] pt-3.5 text-[0.8em] leading-[1.5] text-deep-dim">
      <b className="block text-[1.1em] font-bold text-deep-foreground">Профиль не заполнен</b>
      Инспектор стройконтроля
      <span className="mt-1 block text-[0.95em]">Группа не назначена</span>
    </div>
  </nav>
);

export default SideMenu;