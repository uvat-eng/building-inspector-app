import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/data/settings';
import { JournalEntry, isFixed } from '@/data/journal';
import { buildJournalHtml, journalFileName } from '@/lib/journalXls';

const API = 'https://functions.poehali.dev/4f49fdaa-17fc-4a33-8ce5-205aca1e2f75';

interface JournalSendDialogProps {
  open: boolean;
  entries: JournalEntry[];
  inspector: string;
  onClose: () => void;
}

const JournalSendDialog = ({ open, entries, inspector, onClose }: JournalSendDialogProps) => {
  const { toast } = useToast();
  const { settings, save } = useSettings();
  const [mail, setMail] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    if (open) {
      setMail(settings.customer_email || settings.manager_email || '');
      setLink('');
    }
  }, [open, settings]);

  const publish = async () => {
    const html = buildJournalHtml(entries, inspector);
    const bytes = new TextEncoder().encode(`\ufeff${html}`);
    let bin = '';
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'publish',
        fileName: journalFileName(inspector),
        fileBase64: btoa(bin),
      }),
    });
    if (!res.ok) throw new Error('publish_failed');
    const { url } = (await res.json()) as { url: string };
    return url;
  };

  const send = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim())) {
      toast({ title: 'Проверьте адрес почты', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const url = await publish();
      setLink(url);
      await save({ customer_email: mail.trim() });

      const total = entries.length;
      const open_ = entries.filter((e) => !isFixed(e.fixStatus)).length;
      const subject = `${journalFileName(inspector)} от ${new Date().toLocaleDateString('ru')}`;
      const bodyText =
        `Добрый день!\n\nНаправляю индивидуальный журнал замечаний ИСК.\n` +
        `Инспектор: ${inspector}\nВсего записей: ${total}, не устранено: ${open_}\n\n` +
        `Файл для скачивания:\n${url}\n\nС уважением,\n${inspector}`;

      window.location.href = `mailto:${encodeURIComponent(mail.trim())}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(bodyText)}`;
      toast({ title: 'Письмо подготовлено', description: mail.trim() });
    } catch {
      toast({ title: 'Не удалось подготовить файл', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.1em] uppercase tracking-[0.03em]">
            Отправить журнал заказчику
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Файл сохраняется в системе, в письмо подставляется ссылка на скачивание.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
            Почта заказчика
          </Label>
          <Input
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            placeholder="AminovRRo@tmn.gazprom-neft.ru"
            className="h-9 rounded-sm text-[0.88em]"
          />
        </div>

        {link && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(link);
              toast({ title: 'Ссылка скопирована' });
            }}
            className="flex items-center gap-2 rounded-sm border border-border bg-secondary/50 px-3 py-2 text-left text-[0.78em]"
          >
            <Icon name="Link" size={14} className="flex-none text-accent" />
            <span className="min-w-0 flex-1 truncate">{link}</span>
            <Icon name="Copy" size={13} className="flex-none text-muted-foreground" />
          </button>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-sm" onClick={onClose}>
            Закрыть
          </Button>
          <Button
            disabled={busy}
            onClick={send}
            className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy ? 'Loader2' : 'Send'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            Отправить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JournalSendDialog;
