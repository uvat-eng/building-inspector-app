import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RowProps {
  title: string;
  sub?: string;
  unread?: boolean;
  right?: ReactNode;
  onClick?: () => void;
  active?: boolean;
}

const Row = ({ title, sub, unread, right, onClick, active }: RowProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-center gap-3 border-b border-border/60 px-4 py-[11px] text-left transition-colors last:border-b-0',
      unread && 'bg-accent/[0.04]',
      active ? 'bg-accent/10' : 'hover:bg-secondary/60',
    )}
  >
    <span
      className={cn(
        'w-4 flex-none text-center font-head leading-none',
        unread ? 'text-accent' : 'text-muted-foreground',
      )}
      aria-hidden
    >
      +
    </span>
    <span className="min-w-0 flex-1">
      <span
        className={cn(
          'block truncate text-[0.98em]',
          unread && 'font-bold',
        )}
      >
        {title}
      </span>
      {sub && (
        <span className="mt-0.5 block truncate text-[0.82em] text-muted-foreground">{sub}</span>
      )}
    </span>
    {right}
  </button>
);

export default Row;
