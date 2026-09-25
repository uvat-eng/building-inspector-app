import { useEffect, useRef } from 'react';
import Icon from '@/components/ui/icon';

interface DocPreviewProps {
  /** Готовый HTML документа. */
  html: string;
  /** Заголовок в шапке окна. */
  title: string;
  /** Закрыть просмотр. */
  onClose: () => void;
  /** Сохранить документ в Word. */
  onDownload?: () => void;
}

/**
 * Просмотр печатного документа внутри приложения.
 * Открывать документ в новом окне нельзя: на iPhone такое окно
 * нечем закрыть и сотрудник остаётся в тупике.
 */
const DocPreview = ({ html, title, onClose, onDownload }: DocPreviewProps) => {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const doc = frame.current?.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const print = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    w.focus();
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-foreground/60 backdrop-blur-sm">
      <div className="flex flex-none items-center gap-2 border-b border-border bg-card px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть документ"
          className="flex flex-none items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={15} className="text-accent" />
          Назад
        </button>

        <span className="min-w-0 flex-1 truncate text-center font-head text-[0.9em] tracking-[0.02em] text-foreground">
          {title}
        </span>

        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            aria-label="Сохранить в Word"
            className="flex flex-none items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
          >
            <Icon name="Download" size={15} className="text-accent" />
            <span className="hidden sm:inline">Word</span>
          </button>
        )}

        <button
          type="button"
          onClick={print}
          aria-label="Печать"
          className="flex flex-none items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1.5 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Icon name="Printer" size={15} />
          <span className="hidden sm:inline">Печать</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-sm border border-border transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Icon name="X" size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-muted p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <iframe
          ref={frame}
          title={title}
          className="mx-auto block h-full w-full max-w-[900px] rounded-sm border-0 bg-white shadow-lg"
        />
      </div>
    </div>
  );
};

export default DocPreview;
