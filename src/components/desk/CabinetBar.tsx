import { ReactNode } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  icon?: string;
  onClick?: () => void;
}

interface CabinetBarProps {
  crumbs: Crumb[];
  backLabel?: string;
  onBack?: () => void;
  actions?: ReactNode;
  onExit?: () => void;
}

const CabinetBar = ({ crumbs, backLabel, onBack, actions, onExit }: CabinetBarProps) => (
  <div className="flex flex-none flex-wrap items-center gap-2">
    <span className="flex min-w-0 items-center gap-1.5 text-[0.82em] uppercase tracking-[0.08em]">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <Icon name="ChevronRight" size={13} className="flex-none text-muted-foreground/50" />
            )}
            {c.onClick && !last ? (
              <button
                type="button"
                onClick={c.onClick}
                className="flex min-w-0 flex-none items-center gap-1.5 rounded-sm px-2 py-1 transition-colors hover:bg-secondary hover:text-foreground"
              >
                {c.icon && <Icon name={c.icon} size={14} className="flex-none text-accent" />}
                <span className="truncate">{c.label}</span>
              </button>
            ) : (
              <span
                className={cn(
                  'flex min-w-0 items-center gap-1.5 px-2 py-1',
                  last ? 'font-head tracking-[0.1em] text-muted-foreground' : '',
                )}
              >
                {c.icon && <Icon name={c.icon} size={14} className="flex-none text-accent" />}
                <span className="truncate">{c.label}</span>
              </span>
            )}
          </span>
        );
      })}
    </span>

    {onBack && (
      <button
        type="button"
        onClick={onBack}
        className="flex flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        {backLabel ?? 'Назад'}
      </button>
    )}

    <div className="ml-auto flex flex-wrap items-center gap-2">
      {actions}
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="flex flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-destructive hover:text-destructive"
        >
          <Icon name="LogOut" size={14} />
          Выйти
        </button>
      )}
    </div>
  </div>
);

export default CabinetBar;
