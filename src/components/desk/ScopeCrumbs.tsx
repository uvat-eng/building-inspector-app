import { useMemo } from 'react';
import Icon from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useScope } from '@/data/scope';
import { useLocations } from '@/data/locations';
import { useObjects, NO_FIELD } from '@/data/store';
import { useProfile, ROLE_LABEL, ROLE_ICON, canSeeLocation, shortFio } from '@/data/profile';

/** Первые буквы фамилии и имени для кружка рядом с кнопкой выхода. */
const initials = (fio: string) => {
  const p = fio.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '—';
};

interface ScopeCrumbsProps {
  onLeaveModule: () => void;
  onLeaveScope: () => void;
  onCabinet: () => void;
  onLogout?: () => void;
}

const trigger =
  'flex flex-none items-center gap-1.5 rounded-sm px-2 py-1 font-head text-[0.92em] font-bold uppercase tracking-[0.04em] transition-colors hover:bg-secondary sm:text-[1.02em]';

const ScopeCrumbs = ({
  onLeaveModule,
  onLeaveScope,
  onCabinet,
  onLogout,
}: ScopeCrumbsProps) => {
  const { scope, save } = useScope();
  const { list: locations } = useLocations();
  const { list: objects } = useObjects();
  const { profile } = useProfile();

  const visibleLocations = useMemo(
    () => locations.filter((l) => canSeeLocation(profile, l.id)),
    [locations, profile],
  );

  const locationTitle =
    locations.find((l) => l.id === scope.locationId)?.title ?? 'Все локации';

  const projects = useMemo(() => {
    const set = new Set<string>();
    objects
      .filter((o) => !scope.locationId || o.location === scope.locationId)
      .forEach((o) => set.add(o.field?.trim() || NO_FIELD));
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [objects, scope.locationId]);

  return (
    <div className="flex flex-none items-center gap-0.5 overflow-x-auto border-b border-border bg-card px-3 py-2 sm:px-[18px]">
      <button
        type="button"
        onClick={onLeaveModule}
        className={cn(trigger, 'text-muted-foreground hover:text-accent')}
      >
        <Icon name="ShieldCheck" size={15} />
        <span className="hidden sm:inline">Строительный контроль</span>
        <span className="sm:hidden">СК</span>
      </button>

      <Icon name="ChevronRight" size={13} className="flex-none text-muted-foreground/50" />

      <DropdownMenu>
        <DropdownMenuTrigger className={cn(trigger, 'text-accent')}>
          <span className="max-w-[9rem] truncate sm:max-w-none">{locationTitle}</span>
          <Icon name="ChevronDown" size={13} className="opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[13rem] rounded-sm">
          <DropdownMenuLabel className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
            Локация
          </DropdownMenuLabel>
          {visibleLocations.map((l) => (
            <DropdownMenuItem
              key={l.id}
              onSelect={() => save({ locationId: l.id, project: '' })}
              className="gap-2 rounded-sm text-[0.9em]"
            >
              <Icon
                name={l.id === scope.locationId ? 'Check' : (l.icon ?? 'MapPin')}
                fallback="MapPin"
                size={14}
                className="text-accent"
              />
              {l.title}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLeaveScope} className="gap-2 rounded-sm text-[0.9em]">
            <Icon name="Repeat" size={14} className="text-accent" />
            Все локации
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Icon name="ChevronRight" size={13} className="flex-none text-muted-foreground/50" />

      <DropdownMenu>
        <DropdownMenuTrigger className={cn(trigger, 'text-foreground')}>
          <span className="max-w-[10rem] truncate sm:max-w-none">
            {scope.project || 'Все проекты'}
          </span>
          <Icon name="ChevronDown" size={13} className="opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[14rem] rounded-sm">
          <DropdownMenuLabel className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
            Проект / месторождение
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => save({ project: '' })}
            className="gap-2 rounded-sm text-[0.9em]"
          >
            <Icon name={scope.project ? 'LayoutGrid' : 'Check'} size={14} className="text-accent" />
            Все проекты
          </DropdownMenuItem>
          {projects.map((p) => (
            <DropdownMenuItem
              key={p}
              onSelect={() => save({ project: p })}
              className="gap-2 rounded-sm text-[0.9em]"
            >
              <Icon
                name={p === scope.project ? 'Check' : 'Layers'}
                size={14}
                className="text-accent"
              />
              {p}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Icon name="ChevronRight" size={13} className="flex-none text-muted-foreground/50" />

      <button
        type="button"
        onClick={onCabinet}
        className={cn(trigger, 'text-foreground hover:text-accent')}
      >
        <Icon name={ROLE_ICON[profile.role]} fallback="IdCard" size={15} className="text-accent" />
        <span className="max-w-[10rem] truncate sm:max-w-none">
          Кабинет · {ROLE_LABEL[profile.role]}
        </span>
      </button>

      <div className="ml-auto flex flex-none items-center gap-1">
        <button
          type="button"
          onClick={onLeaveScope}
          title="Сменить локацию или проект"
          className="flex flex-none items-center gap-1 rounded-sm px-2 py-1 text-[0.8em] font-bold uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:bg-secondary hover:text-accent"
        >
          <Icon name="Repeat" size={14} />
          <span className="hidden sm:inline">Сменить</span>
        </button>

        {onLogout && profile.fio && (
          <button
            type="button"
            onClick={onCabinet}
            title={`${profile.fio} · ${ROLE_LABEL[profile.role]}`}
            className="flex min-w-0 flex-none items-center gap-1.5 rounded-sm px-2 py-1 transition-colors hover:bg-secondary"
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent text-[0.68em] font-bold text-accent-foreground">
              {initials(profile.fio)}
            </span>
            <span className="hidden max-w-[9rem] truncate text-[0.82em] font-bold tracking-[0.02em] text-foreground sm:inline">
              {shortFio(profile.fio)}
            </span>
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Выйти из учётной записи"
            className="flex flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1.5 text-[0.8em] font-bold uppercase tracking-[0.06em] text-foreground transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Icon name="LogOut" size={15} />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ScopeCrumbs;