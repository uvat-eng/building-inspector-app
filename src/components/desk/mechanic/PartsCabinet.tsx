import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useProfile } from '@/data/profile';
import { Vehicle } from '@/data/vehicles';
import { ruDate } from '@/data/fleet';
import {
  PART_STATUS,
  PART_TONE,
  PartRequest,
  URGENCY_LABEL,
  patchWb,
  useWaybills,
} from '@/data/waybills';

interface PartsCabinetProps {
  vehicles: Vehicle[];
  canEdit?: boolean;
}

const STATUSES: PartRequest['status'][] = ['new', 'work', 'done', 'declined'];

const PartsCabinet = ({ vehicles, canEdit = true }: PartsCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { parts, loading, reload } = useWaybills();

  const [answerFor, setAnswerFor] = useState<PartRequest | null>(null);
  const [answer, setAnswer] = useState('');

  const vTitle = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.plate || 'б/н'} · ${v.model}` : 'техника не указана';
  };

  const stats = useMemo(
    () =>
      STATUSES.map((s) => ({ s, n: parts.filter((p) => p.status === s).length })),
    [parts],
  );

  const setStatus = async (p: PartRequest, s: PartRequest['status']) => {
    await patchWb('part', p.id, { status: s, answerBy: profile.fio });
    toast({ title: `Статус: ${PART_STATUS[s]}` });
    reload();
  };

  const saveAnswer = async () => {
    if (!answerFor) return;
    await patchWb('part', answerFor.id, { answer, answerBy: profile.fio });
    toast({ title: 'Комментарий сохранён' });
    setAnswerFor(null);
    setAnswer('');
    reload();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((x) => (
          <div
            key={x.s}
            className={cn(
              'flex items-center gap-3 rounded-sm border bg-card px-4 py-3.5',
              PART_TONE[x.s],
            )}
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary">
              <Icon name="PackageSearch" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block font-head text-[1.25em] leading-none">{x.n}</span>
              <span className="mt-1 block truncate text-[0.72em] uppercase tracking-[0.08em]">
                {PART_STATUS[x.s]}
              </span>
            </span>
          </div>
        ))}
      </div>

      <Panel title="Заявки водителей на запчасти" note={`${parts.length}`} className="min-h-0 flex-1">
        {loading && !parts.length ? (
          <Empty icon="Loader" title="Загружаем" hint="Секунду." />
        ) : !parts.length ? (
          <Empty
            icon="PackageSearch"
            title="Заявок пока нет"
            hint="Водители отправят заявки из своего кабинета."
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-y-auto">
            <div className="flex flex-col divide-y divide-border">
              {parts.map((p) => (
                <div key={p.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
                        p.urgency === 'stop'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-secondary text-accent',
                      )}
                    >
                      <Icon name={p.urgency === 'stop' ? 'TriangleAlert' : 'Package'} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-head text-[0.9em] uppercase tracking-[0.03em]">
                        № {p.reqNo || '—'} от {ruDate(p.reqDate)}
                      </span>
                      <span className="block truncate text-[0.76em] text-muted-foreground">
                        {vTitle(p.vehicleId)} · {p.driverFio} · {URGENCY_LABEL[p.urgency]}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex-none rounded-sm border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em]',
                        PART_TONE[p.status],
                      )}
                    >
                      {PART_STATUS[p.status]}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5 rounded-sm border border-border bg-secondary/30 p-2 pl-3">
                    {p.items.map((it, i) => (
                      <span key={i} className="text-[0.8em]">
                        {i + 1}. {it.title}
                        {it.article ? ` · арт. ${it.article}` : ''} — {it.qty} {it.unit}
                      </span>
                    ))}
                  </div>

                  {p.reason && (
                    <p className="text-[0.8em] text-muted-foreground">{p.reason}</p>
                  )}

                  {p.photos?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.photos.map((ph) => (
                        <a key={ph} href={ph} target="_blank" rel="noreferrer">
                          <img
                            src={ph}
                            alt="фото детали"
                            className="h-14 w-14 rounded-sm border border-border object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {p.answer && (
                    <p className="rounded-sm border border-border bg-card px-2.5 py-2 text-[0.8em]">
                      <span className="text-muted-foreground">Ответ: </span>
                      {p.answer}
                      {p.answerBy ? ` — ${p.answerBy}` : ''}
                    </p>
                  )}

                  {canEdit && (
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(p, s)}
                          className={cn(
                            'rounded-sm border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em] transition-colors',
                            p.status === s
                              ? PART_TONE[s] + ' bg-card'
                              : 'border-border text-muted-foreground hover:border-accent',
                          )}
                        >
                          {PART_STATUS[s]}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setAnswerFor(p);
                          setAnswer(p.answer || '');
                        }}
                        className="rounded-sm border border-border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                      >
                        комментарий
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <Dialog open={!!answerFor} onOpenChange={(v) => !v && setAnswerFor(null)}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
              Ответ по заявке
            </DialogTitle>
            <DialogDescription>
              № {answerFor?.reqNo} · {answerFor?.driverFio}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              placeholder="Заказано, приедет с бортом в четверг"
              className="rounded-sm"
            />
            <Button
              onClick={saveAnswer}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="Check" size={16} />
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartsCabinet;
