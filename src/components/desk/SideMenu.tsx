import { cn } from '@/lib/utils';
import Icon from '@/components/ui/icon';
import ProfileCard from '@/components/desk/ProfileCard';
import DeleteAccountButton from '@/components/desk/DeleteAccountButton';
import { MENU, SectionId } from '@/data/mock';
import { useProfile, ROLE_SECTIONS, ROLE_LABEL, ROLE_ICON, Role } from '@/data/profile';
import { useUsers } from '@/data/users';
import { useImpersonation } from '@/data/impersonate';

/** Кабинеты, куда директор может провалиться из своего меню. */
const DIRECTOR_CABINETS: Role[] = ['manager', 'engineer', 'inspector'];

interface SideMenuProps {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  onOpenCabinetOf?: (role: Role) => void;
  onLogout?: () => void;
  className?: string;
}

const SideMenu = ({
  active,
  onSelect,
  onOpenCabinetOf,
  onLogout,
  className,
}: SideMenuProps) => {
  const { profile } = useProfile();
  const { current } = useUsers();
  const { impersonation } = useImpersonation();
  const isDirector = profile.role === 'director' && !impersonation;
  const allowed = profile.role === 'admin' ? null : ROLE_SECTIONS[profile.role];
  const isManager = ['pm', 'coordinator', 'manager', 'director'].includes(profile.role);
  const isMechanic = profile.role === 'mechanic';
  const items = (allowed ? MENU.filter((m) => allowed.includes(m.id)) : MENU).map((m) => {
    if (m.id !== 'cabinet') return m;
    if (isMechanic) return { ...m, label: 'Кабинет механика', icon: 'Wrench' };
    if (profile.role === 'driver') return { ...m, label: 'Кабинет водителя', icon: 'Truck' };
    if (isManager) return { ...m, label: 'Кабинет менеджера', icon: 'FileSignature' };
    return m;
  });
  return (
  <nav
    className={cn(
      'flex min-h-0 flex-col rounded-sm border border-foreground/85 bg-card pt-[18px]',
      className,
    )}
  >
    <div className="border-b-2 border-foreground/85 px-[18px] pb-3 text-[0.72em] uppercase tracking-[0.18em] text-muted-foreground">
      {current ? `Разделы · ${ROLE_LABEL[profile.role]}` : 'Разделы'}
    </div>
    <ul className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      {items.map((item) => {
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
            {item.id === 'cabinet' && isDirector && (
              <ul className="border-t border-foreground/85 bg-secondary/40">
                {DIRECTOR_CABINETS.map((r) => (
                  <li key={r} className="border-b border-foreground/20 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onOpenCabinetOf?.(r)}
                      className="group flex w-full items-center gap-2.5 border-l-[3px] border-l-transparent py-[10px] pl-[30px] pr-[18px] text-left text-[0.86em] text-foreground transition-colors duration-200 hover:bg-foreground hover:text-background"
                    >
                      <Icon
                        name={ROLE_ICON[r]}
                        fallback="User"
                        size={14}
                        className="flex-none text-accent"
                      />
                      <span className="truncate">Кабинет · {ROLE_LABEL[r]}</span>
                      <Icon
                        name="ChevronRight"
                        size={13}
                        className="ml-auto flex-none text-muted-foreground group-hover:text-background"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
    <ProfileCard />
    {current && onLogout && (
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full flex-none items-center justify-center gap-2 border-t-2 border-foreground/85 bg-card px-[18px] py-3.5 text-[0.88em] font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        <Icon name="LogOut" size={16} />
        Выйти из учётной записи
      </button>
    )}
    {current && <DeleteAccountButton user={current} />}
  </nav>
  );
};

export default SideMenu;