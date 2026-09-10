import { useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface Props {
  hint: string;
  busy?: boolean;
  onFiles: (files: File[]) => void;
}

/** Визуальное «ведро» на пол-страницы: сюда инспектор складывает документацию. */
const DropBucket = ({ hint, busy, onFiles }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        'relative flex min-h-[46vh] flex-col items-center justify-center rounded-sm border-2 border-dashed px-5 py-8 text-center transition-colors',
        over ? 'border-accent bg-accent/10' : 'border-border bg-card',
      )}
    >
      <svg viewBox="0 0 200 180" className="h-40 w-44 sm:h-48 sm:w-52" aria-hidden>
        <defs>
          <linearGradient id="bucketBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--secondary))" />
            <stop offset="100%" stopColor="hsl(var(--muted))" />
          </linearGradient>
        </defs>
        <ellipse
          cx="100"
          cy="34"
          rx="72"
          ry="18"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="3"
        />
        <path
          d="M28 34 L44 158 Q46 170 58 170 L142 170 Q154 170 156 158 L172 34 Z"
          fill="url(#bucketBody)"
          stroke="hsl(var(--accent))"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M36 74 L164 74"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <path
          d="M100 132 L100 60 M100 60 L78 84 M100 60 L122 84"
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <p className="mt-4 font-head text-[1.1em] uppercase tracking-[0.05em] sm:text-[1.3em]">
        Документация на объект
      </p>
      <p className="mt-2 max-w-md text-[0.87em] text-muted-foreground">{hint}</p>

      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="mt-5 flex items-center gap-2 rounded-sm bg-accent px-7 py-3.5 font-head text-[1em] uppercase tracking-[0.06em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Icon name={busy ? 'LoaderCircle' : 'Upload'} size={19} className={cn(busy && 'animate-spin')} />
        {busy ? 'Загрузка…' : 'Загрузить'}
      </button>

      <p className="mt-3 text-[0.78em] text-muted-foreground">
        Или перетащите файлы сюда · PDF, DOCX, сканы и фото (JPG, PNG)
      </p>

      <input
        ref={ref}
        type="file"
        multiple
        hidden
        accept=".pdf,.docx,.txt,.csv,image/*"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default DropBucket;
