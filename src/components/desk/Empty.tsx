import Icon from '@/components/ui/icon';

interface EmptyProps {
  icon?: string;
  title: string;
  hint?: string;
}

const Empty = ({ icon = 'Inbox', title, hint }: EmptyProps) => (
  <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 p-6 text-center">
    <Icon name={icon} size={26} className="text-muted-foreground/60" />
    <div className="font-head text-[0.9em] uppercase tracking-[0.1em]">{title}</div>
    {hint && <p className="max-w-[280px] text-[0.85em] text-muted-foreground">{hint}</p>}
  </div>
);

export default Empty;
