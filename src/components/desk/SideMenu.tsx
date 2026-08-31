import { cn } from '@/lib/utils';
import Icon from '@/components/ui/icon';
import ProfileCard from '@/components/desk/ProfileCard';
import { MENU, SectionId } from '@/data/mock';
import { useProfile } from '@/data/profile';

interface SideMenuProps {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  className?: string;
}

const SideMenu = ({ active, onSelect, className }: SideMenuProps) => {
  const { profile } = useProfile();
  return (
  <nav
    className={cn(
      'flex min-h-0 flex-col rounded-sm border border-foreground/85 bg-card pt-[18px]',
      className,
    )}
  >
    <div className="border-b-2 border-foreground/85 px-[18px] pb-3 text-[0.72em] uppercase tracking-[0.18em] text-muted-foreground">
      Разделы
    </div>
    <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      {MENU.filter(
        (item) => item.id !== 'staff' || profile.role === 'coordinator' || profile.role === 'director',
      ).map((item) => {
        const on = item.id === active;
        return (
          <li key={item.id} className="border-b border-foreground/85 last:border-b-0">
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                'group flex w-full items-center gap-2.5 border-l-[3px] px-[18px] py-[12px] text-left text-[0.95em] transition-colors duration-200',
                on
                  ? 'border-l-accent bg-foreground font-bold text-background'
                  : 'border-l-transparent text-foreground hover:bg-foreground hover:text-background',
              )}
            >
              <Icon name={item.icon} size={16} className="flex-none text-accent" />
              <span className="truncate">{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
    <ProfileCard />
  </nav>
  );
};

export default SideMenu;