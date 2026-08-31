import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  title: string;
  note?: string;
  className?: string;
  children: ReactNode;
  action?: ReactNode;
}

const Panel = ({ title, note, className, children, action }: PanelProps) => (
  <section
    className={cn(
      'flex min-h-0 flex-col overflow-hidden rounded-sm border border-border border-t-2 border-t-accent bg-card',
      className,
    )}
  >
    <h2 className="flex items-center gap-3 border-b border-border px-4 py-3 font-head text-[0.88em] uppercase tracking-[0.12em]">
      {title}
      {action}
      {note && (
        <span className="ml-auto font-body text-muted-foreground tracking-[0.06em] normal-case">
          {note}
        </span>
      )}
    </h2>
    <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
  </section>
);

export default Panel;
