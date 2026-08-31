import { cn } from '@/lib/utils';
import type { TagTone } from '@/data/mock';

const TONES: Record<TagTone, string> = {
  hot: 'text-accent border-current',
  ok: 'text-success border-current',
  wait: 'text-warning border-current',
  dim: 'text-muted-foreground border-border',
};

interface TagProps {
  tone: TagTone;
  children: React.ReactNode;
  className?: string;
}

const Tag = ({ tone, children, className }: TagProps) => (
  <span
    className={cn(
      'flex-none rounded-sm border px-2 py-1 text-[0.75em] uppercase tracking-[0.08em]',
      TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);

export default Tag;
