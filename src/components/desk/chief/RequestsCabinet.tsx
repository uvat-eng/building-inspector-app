import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProfile } from '@/data/profile';
import { useChiefScope } from '@/data/chief';
import RequestDialog from '@/components/desk/chief/RequestDialog';
import {
  REQUEST_INFO,
  RequestKind,
  WorkRequest,
  useRequests,
} from '@/data/requests';

interface RequestsCabinetProps {
  kind: RequestKind;
  onBack?: () => void;
}

const money = (v: number) => v.toLocaleString('ru', { maximumFractionDigits: 0 });

const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

const tone = (s: string) =>
  s === 'утверждено' ? 'ok' : s === 'отклонено' ? 'hot' : s === 'исполнено' ? 'dim' : 'wait';

const RequestsCabinet = ({ kind, onBack }: RequestsCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { objects, inScope, wide } = useChiefScope();
  const { items, loading, create, update, remove } = useRequests(kind);

  const [dlg, setDlg] = useState(false);
  const [edit, setEdit] = useState<WorkRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const info = REQUEST_INFO[kind];
  const canDecide = ['manager', 'director', 'admin', 'pm', 'coordinator'].includes(profile.role);

  const list = useMemo(
    () =>
      items.filter(
        (r) =>
          wide ||
          r.authorFio === profile.fio ||
          inScope({ objectId: r.objectId, objectTitle: r.objectTitle, author: r.authorFio }),
      ),
    [items, wide, profile.fio, inScope],
  );

  const counters = [
    { icon: 'FileStack', label: 'Всего заявок', value: list.length },
    {
      icon: 'Clock',
      label: 'На согласовании',
      value: list.filter((r) => r.status === 'на согласовании').length,
    },
    {
      icon: 'CircleCheck',
      label: 'Утверждено',
      value: list.filter((r) => r.status === 'утверждено').length,
    },
    { icon: 'Wallet', label: 'Сумма, ₽', value: money(list.reduce((a, r) => a + r.total, 0)) },
  ];

  const save = async (data: Partial<WorkRequest>) => {
    if (!data.title?.trim()) {
      toast({ title: 'Укажите наименование заявки', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      if (edit) await update(edit.id, data);
      else
        await create({
          ...data,
          authorId: profile.userId ?? profile.fio,
          authorFio: profile.fio,
          locationId: profile.locations?.[0] ?? '',
          status: 'на согласовании',
        });
      setDlg(false);
      setEdit(null);
      toast({
        title: edit ? 'Заявка обновлена' : 'Заявка отправлена',
        description: edit ? undefined : 'Ушла руководителю проекта на утверждение.',
      });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const decide = async (r: WorkRequest, status: string) => {
    await update(r.id, {
      status,
      decidedBy: profile.fio,
      decidedAt: new Date().toISOString().slice(0, 10),
    });
    toast({ title: `Заявка ${r.number}: ${status}` });
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          К обзору
        </button>
      )}

      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
        <h1 className="font-head text-[1.05em] uppercase leading-tight tracking-[0.03em]">
          {info.title}
        </h1>
        <p className="mt-1 text-[0.85em] text-muted-foreground">{info.note}</p>
      </section>

      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {counters.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={c.icon} fallback="Circle" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block font-head text-[22px] leading-none">{c.value}</span>
              <span className="mt-1 block truncate text-[0.74em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={() => {
          setEdit(null);
          setDlg(true);
        }}
        className="h-12 flex-none gap-2 rounded-sm bg-accent font-head text-[0.9em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon name={info.icon} fallback="Plus" size={18} />
        Создать заявку
      </Button>

      <Panel title="Заявки" note={`${list.length}`}>
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Загружаем заявки…
          </p>
        ) : list.length === 0 ? (
          <Empty icon={info.icon} title="Заявок нет" hint="Создайте первую заявку." />
        ) : (
          list.map((r) => (
            <div
              key={r.id}
              className="border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                  <Icon name={info.icon} fallback="FileText" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92em]">
                    {r.number} · {r.title}
                  </span>
                  <span className="block truncate text-[0.76em] text-muted-foreground">
                    {r.authorFio} · {r.objectTitle || '—'} · {r.items.length} позиций ·{' '}
                    {money(r.total)} ₽{r.needDate ? ` · к ${ruDate(r.needDate)}` : ''}
                  </span>
                </span>
                <Tag tone={tone(r.status) as never}>{r.status}</Tag>
                <button
                  type="button"
                  title="Редактировать"
                  onClick={() => {
                    setEdit(r);
                    setDlg(true);
                  }}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                >
                  <Icon name="Pencil" size={14} />
                </button>
                <button
                  type="button"
                  title="Удалить"
                  onClick={() => remove(r.id)}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:bg-border hover:text-destructive"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>

              {canDecide && r.status === 'на согласовании' && (
                <div className="mt-2 flex gap-2 pl-12">
                  <button
                    type="button"
                    onClick={() => decide(r, 'утверждено')}
                    className={cn(
                      'rounded-sm border border-accent bg-accent px-3 py-1.5 text-[0.78em]',
                      'text-accent-foreground transition-colors hover:bg-accent/90',
                    )}
                  >
                    Утвердить
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(r, 'отклонено')}
                    className="rounded-sm border border-input px-3 py-1.5 text-[0.78em] transition-colors hover:bg-secondary"
                  >
                    Отклонить
                  </button>
                </div>
              )}

              {r.decidedBy && (
                <p className="mt-1.5 pl-12 text-[0.76em] text-muted-foreground">
                  {r.status} · {r.decidedBy} · {ruDate(r.decidedAt)}
                </p>
              )}
            </div>
          ))
        )}
      </Panel>

      <RequestDialog
        open={dlg}
        kind={kind}
        request={edit}
        objects={objects.map((o) => ({ id: o.id, title: o.title }))}
        busy={busy}
        onClose={() => {
          setDlg(false);
          setEdit(null);
        }}
        onSave={save}
      />
    </div>
  );
};

export default RequestsCabinet;
