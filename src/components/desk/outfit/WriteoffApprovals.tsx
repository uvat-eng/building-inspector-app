import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/data/profile';
import { useWriteoffs, Writeoff, fmt } from '@/data/outfit';
import { buildWriteoffActHtml, printHtml } from '@/lib/ppeDoc';

const STEP_FOR: Record<string, 'engineer' | 'manager'> = {
  engineer: 'engineer',
  manager: 'manager',
  director: 'manager',
  admin: 'manager',
};

const WriteoffApprovals = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { items, loading, decide } = useWriteoffs();
  const [busy, setBusy] = useState('');
  const [declineFor, setDeclineFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const step = STEP_FOR[profile.role];
  const waitStatus = step === 'engineer' ? 'review' : 'approval';
  const mine = items.filter((w) => w.status === waitStatus);
  const rest = items.filter((w) => w.status !== waitStatus);

  const approve = async (w: Writeoff) => {
    if (!step) return;
    setBusy(w.id);
    try {
      const res = await decide(w.id, step, profile.fio);
      toast({
        title: step === 'engineer' ? 'Согласовано' : `Утверждено · акт № ${res.actNo}`,
        description:
          step === 'engineer'
            ? 'Заявка ушла руководителю проекта'
            : 'Спецодежда отмечена списанной, акт готов к печати',
      });
    } catch {
      toast({ title: 'Не удалось провести решение', variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const reject = async () => {
    if (!declineFor) return;
    setBusy(declineFor);
    try {
      await decide(declineFor, 'decline', profile.fio, reason.trim());
      setDeclineFor(null);
      setReason('');
      toast({ title: 'Заявка отклонена' });
    } catch {
      toast({ title: 'Не удалось отклонить', variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const card = (w: Writeoff, actions: boolean) => (
    <div key={w.id} className="border-b border-border/60 px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.95em]">
            {w.items.map((i) => `${i.title}${i.size ? ` (${i.size})` : ''}`).join(', ')}
          </span>
          <span className="block truncate text-[0.8em] text-muted-foreground">
            {w.holderFio} · заявка от {fmt(w.createdAt)}
          </span>
          <span className="mt-1 block text-[0.84em]">Причина: {w.reason || '—'}</span>
        </span>
        <Tag tone={w.status === 'done' ? 'ok' : w.status === 'declined' ? 'hot' : 'wait'}>
          {w.status === 'done'
            ? `акт № ${w.actNo}`
            : w.status === 'declined'
              ? 'отклонено'
              : w.status === 'review'
                ? 'ст. инженер'
                : 'руководитель'}
        </Tag>
      </div>

      {w.photos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {w.photos.map((p) => (
            <a key={p} href={p} target="_blank" rel="noreferrer">
              <img src={p} alt="фото" className="h-16 w-16 rounded-sm object-cover" />
            </a>
          ))}
        </div>
      )}

      {actions && declineFor !== w.id && (
        <div className="mt-2.5 flex gap-2">
          <Button
            size="sm"
            disabled={busy === w.id}
            onClick={() => approve(w)}
            className="h-9 flex-1 gap-1.5 rounded-sm bg-accent font-head text-[0.82em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy === w.id ? 'Loader2' : 'Check'}
              size={15}
              className={busy === w.id ? 'animate-spin' : ''}
            />
            {step === 'engineer' ? 'Согласовать' : 'Утвердить'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 gap-1.5 rounded-sm text-[0.82em] uppercase tracking-[0.06em]"
            onClick={() => setDeclineFor(w.id)}
          >
            <Icon name="X" size={15} />
            Отклонить
          </Button>
        </div>
      )}

      {declineFor === w.id && (
        <div className="mt-2.5 flex gap-2">
          <Input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Причина отказа"
            className="h-9 rounded-sm"
          />
          <Button size="sm" className="h-9 rounded-sm" onClick={reject}>
            Отклонить
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-sm"
            onClick={() => setDeclineFor(null)}
          >
            Отмена
          </Button>
        </div>
      )}

      {w.status === 'done' && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2.5 h-9 w-full gap-1.5 rounded-sm text-[0.82em] uppercase tracking-[0.06em]"
          onClick={() =>
            printHtml(buildWriteoffActHtml(w, profile.org), `Акт списания № ${w.actNo}`)
          }
        >
          <Icon name="Printer" size={15} className="text-accent" />
          Акт списания на подпись
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Списание спецодежды · на решение" note={`${mine.length}`}>
        {loading ? (
          <Empty icon="Loader2" title="Загрузка…" hint="Собираем заявки." />
        ) : mine.length === 0 ? (
          <Empty
            icon="FileCheck2"
            title="Заявок нет"
            hint="Здесь появятся заявки инспекторов на списание СИЗ."
          />
        ) : (
          mine.map((w) => card(w, true))
        )}
      </Panel>

      {rest.length > 0 && (
        <Panel title="История списаний" note={`${rest.length}`}>
          {rest.map((w) => card(w, false))}
        </Panel>
      )}
    </div>
  );
};

export default WriteoffApprovals;