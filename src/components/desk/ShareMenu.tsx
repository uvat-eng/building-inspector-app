import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

export interface ShareDoc {
  fileName: string;
  subject: string;
  text: string;
  csv?: string;
  html?: string;
}

interface ShareMenuProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: ShareDoc;
}

const download = (name: string, content: string, mime: string) => {
  const blob = new Blob([`\uFEFF${content}`], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const ShareMenu = ({ open, onOpenChange, doc }: ShareMenuProps) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const canShareFiles =
    typeof navigator !== 'undefined' && !!navigator.canShare && !!navigator.share;

  const shareFile = async () => {
    setBusy(true);
    try {
      const file = new File([`\uFEFF${doc.csv ?? doc.text}`], doc.fileName, {
        type: 'text/csv;charset=utf-8',
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: doc.subject, text: doc.text });
        onOpenChange(false);
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: doc.subject, text: doc.text });
        onOpenChange(false);
        return;
      }
      download(doc.fileName, doc.csv ?? doc.text, 'text/csv');
      toast({ title: 'Файл скачан', description: 'Прикрепите его в нужном приложении.' });
    } catch {
      /* пользователь отменил */
    } finally {
      setBusy(false);
    }
  };

  const items: { icon: string; label: string; note: string; run: () => void }[] = [
    {
      icon: 'Share2',
      label: canShareFiles ? 'Отправить в приложение' : 'Скачать файл',
      note: canShareFiles
        ? 'Почта, мессенджеры, облако — системное меню устройства'
        : 'Файл сохранится, затем прикрепите его вручную',
      run: shareFile,
    },
    {
      icon: 'Mail',
      label: 'Электронная почта',
      note: 'Откроется почтовая программа с готовым письмом',
      run: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(
          doc.subject,
        )}&body=${encodeURIComponent(doc.text)}`;
        onOpenChange(false);
      },
    },
    {
      icon: 'Send',
      label: 'Telegram',
      note: 'Переслать текст табеля в чат',
      run: () => {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(doc.subject)}&text=${encodeURIComponent(
            doc.text,
          )}`,
          '_blank',
        );
        onOpenChange(false);
      },
    },
    {
      icon: 'MessageCircle',
      label: 'WhatsApp',
      note: 'Переслать текст табеля в чат',
      run: () => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${doc.subject}\n\n${doc.text}`)}`,
          '_blank',
        );
        onOpenChange(false);
      },
    },
    {
      icon: 'FileSpreadsheet',
      label: 'Скачать таблицей (Excel/CSV)',
      note: 'Файл для бухгалтерии и архива',
      run: () => {
        download(doc.fileName, doc.csv ?? doc.text, 'text/csv');
        toast({ title: 'Файл сохранён' });
        onOpenChange(false);
      },
    },
    {
      icon: 'Copy',
      label: 'Скопировать текст',
      note: 'Вставить в любое приложение вручную',
      run: async () => {
        await navigator.clipboard.writeText(`${doc.subject}\n\n${doc.text}`);
        toast({ title: 'Скопировано в буфер обмена' });
        onOpenChange(false);
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.25em] uppercase tracking-[0.03em]">
            Отправить табель
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Выберите, куда передать документ.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-6 border-y border-foreground/85">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              disabled={busy}
              onClick={it.run}
              className="group flex w-full items-center gap-3 border-b border-foreground/85 px-6 py-3 text-left transition-colors last:border-b-0 hover:bg-foreground hover:text-background disabled:opacity-60"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name={it.icon} fallback="Share2" size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[1em] uppercase tracking-[0.03em]">
                  {it.label}
                </span>
                <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                  {it.note}
                </span>
              </span>
              <Icon name="ChevronRight" size={18} className="flex-none opacity-50" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareMenu;
