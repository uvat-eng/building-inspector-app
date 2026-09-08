import { useMemo, useRef, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import CabinetBar from '@/components/desk/CabinetBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useObjects, NO_FIELD } from '@/data/store';
import {
  CustLetter,
  CustPoint,
  LetterKind,
  PointStatus,
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  createLetter,
  createReply,
  patchPoint,
  readFile,
  removeItem,
  ruDate,
  useLetters,
  ymTitle,
} from '@/data/letters';

interface LettersCabinetProps {
  onBack?: () => void;
  readOnly?: boolean;
}

const emptyLetter = {
  number: '',
  letterDate: '',
  sender: '',
  subject: '',
  fieldKey: '',
  objectId: '',
  dueAt: '',
  note: '',
};

const LettersCabinet = ({ onBack, readOnly = false }: LettersCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { letters, replies, points, loading, reload } = useLetters();

  const [tab, setTab] = useState<LetterKind>('letter');
  const [openYm, setOpenYm] = useState<string | null>(null);
  const [openLetter, setOpenLetter] = useState<string | null>(null);

  const [form, setForm] = useState(false);
  const [f, setF] = useState(emptyLetter);
  const [file, setFile] = useState<File | null>(null);
  const [rawPoints, setRawPoints] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [replyFor, setReplyFor] = useState<CustLetter | null>(null);
  const [r, setR] = useState({ number: '', replyDate: '', subject: '', note: '' });
  const [rFile, setRFile] = useState<File | null>(null);
  const rFileRef = useRef<HTMLInputElement>(null);

  const [statusFor, setStatusFor] = useState<CustPoint | null>(null);
  const [sNote, setSNote] = useState('');
  const [busy, setBusy] = useState(false);

  const mine = useMemo(() => letters.filter((l) => l.kind === tab), [letters, tab]);

  const repliesOf = (id: string) => replies.filter((x) => x.letterId === id);
  const pointsOf = (id: string) => points.filter((x) => x.letterId === id);

  const byMonth = useMemo(() => {
    const map = new Map<string, CustLetter[]>();
    mine.forEach((l) => {
      const key = l.ym || 'Без даты';
      map.set(key, [...(map.get(key) ?? []), l]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [mine]);

  const stats = useMemo(() => {
    const total = mine.length;
    const answered = mine.filter((l) => repliesOf(l.id).length > 0).length;
    const all = points.filter((p) => mine.some((l) => l.id === p.letterId));
    const byStatus = STATUS_ORDER.map((s) => ({
      status: s,
      count: all.filter((p) => p.status === s).length,
    }));
    return { total, answered, left: total - answered, points: all.length, byStatus };
  }, [mine, points, replies]);

  const projects = useMemo(() => {
    const set = new Set(objects.map((o) => o.field?.trim() || NO_FIELD));
    return [...set].sort((x, y) => x.localeCompare(y, 'ru'));
  }, [objects]);

  const save = async () => {
    if (!f.number.trim() || !f.letterDate) {
      toast({ title: 'Укажите номер и дату', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const payload: Parameters<typeof createLetter>[1] = {
        ...f,
        author: profile.fio,
      };
      if (file) {
        payload.content = await readFile(file);
        payload.fileName = file.name;
        payload.mime = file.type;
      }
      if (tab === 'protocol' && rawPoints.trim()) {
        payload.points = rawPoints
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((line, i) => {
            const m = line.match(/^(\d+[.)]?)\s+(.*)$/);
            return { num: m ? m[1].replace(/[.)]$/, '') : String(i + 1), text: m ? m[2] : line };
          });
      }
      await createLetter(tab, payload);
      toast({ title: tab === 'letter' ? 'Письмо добавлено' : 'Протокол добавлен' });
      setForm(false);
      setF(emptyLetter);
      setFile(null);
      setRawPoints('');
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveReply = async () => {
    if (!replyFor) return;
    if (!r.number.trim() || !r.replyDate) {
      toast({ title: 'Укажите номер и дату ответа', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const payload: Parameters<typeof createReply>[0] = {
        letterId: replyFor.id,
        ...r,
        author: profile.fio,
      };
      if (rFile) {
        payload.content = await readFile(rFile);
        payload.fileName = rFile.name;
        payload.mime = rFile.type;
      }
      await createReply(payload);
      toast({ title: 'Ответ добавлен' });
      setReplyFor(null);
      setR({ number: '', replyDate: '', subject: '', note: '' });
      setRFile(null);
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить ответ', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (p: CustPoint, s: PointStatus) => {
    await patchPoint(p.id, { status: s, statusBy: profile.fio });
    reload();
  };

  const saveStatusNote = async () => {
    if (!statusFor) return;
    await patchPoint(statusFor.id, { statusNote: sNote, statusBy: profile.fio });
    setStatusFor(null);
    setSNote('');
    reload();
  };

  const drop = async (kind: 'letter' | 'reply' | 'point', id: string) => {
    await removeItem(kind, id);
    reload();
  };

  const counters =
    tab === 'letter'
      ? [
          { label: 'Пришло писем', value: stats.total, icon: 'Mail' },
          { label: 'Отвечено', value: stats.answered, icon: 'MailCheck' },
          { label: 'Без ответа', value: stats.left, icon: 'MailWarning' },
          { label: 'Месяцев в архиве', value: byMonth.length, icon: 'CalendarDays' },
        ]
      : [
          { label: 'Протоколов', value: stats.total, icon: 'FileText' },
          { label: 'Всего пунктов', value: stats.points, icon: 'ListChecks' },
          {
            label: 'Выполнено',
            value: stats.byStatus.find((x) => x.status === 'done')?.count ?? 0,
            icon: 'CircleCheck',
          },
          {
            label: 'Не начато',
            value: stats.byStatus.find((x) => x.status === 'open')?.count ?? 0,
            icon: 'CircleAlert',
          },
        ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {onBack && (
        <CabinetBar
          crumbs={[
            { label: 'Кабинет', icon: 'LayoutGrid', onClick: onBack },
            { label: 'Переписка с заказчиком', icon: 'Mails' },
          ]}
          backLabel="В кабинет"
          onBack={onBack}
        />
      )}

      <div className="flex flex-none gap-1.5">
        {(
          [
            { k: 'letter' as const, l: 'Письма', i: 'Mail' },
            { k: 'protocol' as const, l: 'Протоколы', i: 'FileText' },
          ]
        ).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => {
              setTab(t.k);
              setOpenYm(null);
              setOpenLetter(null);
            }}
            className={cn(
              'flex items-center gap-2 rounded-sm border px-3.5 py-2 text-[0.86em] font-head uppercase tracking-[0.06em] transition-colors',
              tab === t.k
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-card hover:border-accent hover:bg-secondary',
            )}
          >
            <Icon name={t.i} size={15} />
            {t.l}
            <span className="opacity-70">
              {letters.filter((l) => l.kind === t.k).length}
            </span>
          </button>
        ))}
      </div>

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
              <span className="mt-1 block truncate text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      {tab === 'protocol' && stats.points > 0 && (
        <Panel title="Статусы пунктов протоколов" className="flex-none">
          <div className="flex flex-wrap gap-2 p-3">
            {stats.byStatus.map((x) => {
              const share = stats.points
                ? Math.round((x.count / stats.points) * 100)
                : 0;
              return (
                <span
                  key={x.status}
                  className={cn(
                    'flex min-w-[9rem] flex-1 flex-col gap-1 rounded-sm border px-3 py-2',
                    STATUS_TONE[x.status],
                  )}
                >
                  <span className="font-head text-[1.3em] leading-none">{x.count}</span>
                  <span className="text-[0.74em] uppercase tracking-[0.08em]">
                    {STATUS_LABEL[x.status]} · {share}%
                  </span>
                  <span className="h-1 overflow-hidden rounded-sm bg-secondary">
                    <span
                      className="block h-full bg-current"
                      style={{ width: `${share}%` }}
                    />
                  </span>
                </span>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel
        title={tab === 'letter' ? 'Входящие письма по месяцам' : 'Протоколы по месяцам'}
        note={`${mine.length} шт.`}
        className="min-h-0 flex-1"
        action={
          !readOnly ? (
            <Button
              size="sm"
              onClick={() => setForm(true)}
              className="ml-auto gap-1.5 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="Plus" size={14} />
              {tab === 'letter' ? 'Письмо' : 'Протокол'}
            </Button>
          ) : undefined
        }
      >
        {loading && !mine.length ? (
          <Empty icon="Loader" title="Загружаем переписку" hint="Секунду." />
        ) : !mine.length ? (
          <Empty
            icon={tab === 'letter' ? 'Mail' : 'FileText'}
            title={tab === 'letter' ? 'Писем пока нет' : 'Протоколов пока нет'}
            hint={
              readOnly
                ? 'Материалы вносит руководитель проекта.'
                : tab === 'letter'
                  ? 'Нажмите «Письмо» — приложите скан входящего, затем добавьте ответ.'
                  : 'Нажмите «Протокол» — впишите пункты, статусы проставите потом.'
            }
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-y-auto">
            <div className="flex flex-col divide-y divide-border">
              {byMonth.map(([ym, list]) => {
                const answered = list.filter((l) => repliesOf(l.id).length > 0).length;
                const mPoints = points.filter((p) => list.some((l) => l.id === p.letterId));
                const mDone = mPoints.filter((p) => p.status === 'done').length;
                const on = openYm === ym;
                return (
                  <div key={ym} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setOpenYm(on ? null : ym)}
                      className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                        <Icon name="CalendarDays" size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-head text-[0.95em] uppercase tracking-[0.04em]">
                          {ymTitle(ym)}
                        </span>
                        <span className="block text-[0.78em] text-muted-foreground">
                          {tab === 'letter'
                            ? `пришло ${list.length} · отвечено ${answered} · без ответа ${list.length - answered}`
                            : `протоколов ${list.length} · пунктов ${mPoints.length} · выполнено ${mDone}`}
                        </span>
                      </span>
                      <Icon
                        name={on ? 'ChevronUp' : 'ChevronDown'}
                        size={16}
                        className="flex-none text-muted-foreground"
                      />
                    </button>

                    {on && (
                      <div className="flex flex-col gap-2 px-3 pb-3">
                        {list.map((l) => {
                          const reps = repliesOf(l.id);
                          const pts = pointsOf(l.id);
                          const shown = openLetter === l.id;
                          const done = pts.filter((p) => p.status === 'done').length;
                          return (
                            <div
                              key={l.id}
                              className="rounded-sm border border-border bg-card"
                            >
                              <button
                                type="button"
                                onClick={() => setOpenLetter(shown ? null : l.id)}
                                className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
                              >
                                <span
                                  className={cn(
                                    'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
                                    tab === 'letter' && !reps.length
                                      ? 'bg-destructive/10 text-destructive'
                                      : 'bg-secondary text-accent',
                                  )}
                                >
                                  <Icon
                                    name={tab === 'letter' ? 'Mail' : 'FileText'}
                                    size={16}
                                  />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-head text-[0.9em] uppercase tracking-[0.03em]">
                                    № {l.number} от {ruDate(l.letterDate)}
                                  </span>
                                  <span className="block truncate text-[0.82em]">
                                    {l.subject || 'Без темы'}
                                  </span>
                                  <span className="block truncate text-[0.76em] text-muted-foreground">
                                    {l.sender}
                                    {l.fieldKey ? ` · ${l.fieldKey}` : ''}
                                    {l.dueAt ? ` · срок ${ruDate(l.dueAt)}` : ''}
                                  </span>
                                </span>
                                <span className="flex flex-none flex-col items-end gap-1">
                                  {tab === 'letter' ? (
                                    <span
                                      className={cn(
                                        'rounded-sm border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em]',
                                        reps.length
                                          ? 'border-emerald-600 text-emerald-600'
                                          : 'border-destructive text-destructive',
                                      )}
                                    >
                                      {reps.length ? `отвечено ${reps.length}` : 'без ответа'}
                                    </span>
                                  ) : (
                                    <span className="rounded-sm border border-border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em] text-muted-foreground">
                                      {done} / {pts.length}
                                    </span>
                                  )}
                                </span>
                                <Icon
                                  name={shown ? 'ChevronUp' : 'ChevronDown'}
                                  size={15}
                                  className="mt-1 flex-none text-muted-foreground"
                                />
                              </button>

                              {shown && (
                                <div className="flex flex-col gap-2 border-t border-border p-3">
                                  {l.note && (
                                    <p className="text-[0.82em] text-muted-foreground">
                                      {l.note}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-2">
                                    {l.fileUrl && (
                                      <a
                                        href={l.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-[0.8em] transition-colors hover:border-accent hover:text-accent"
                                      >
                                        <Icon name="Paperclip" size={13} />
                                        <span className="max-w-[13rem] truncate">
                                          {l.fileName || 'Скан'}
                                        </span>
                                      </a>
                                    )}
                                    {!readOnly && tab === 'letter' && (
                                      <Button
                                        size="sm"
                                        onClick={() => setReplyFor(l)}
                                        className="gap-1.5 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
                                      >
                                        <Icon name="Reply" size={14} />
                                        Ответ
                                      </Button>
                                    )}
                                    {!readOnly && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => drop('letter', l.id)}
                                        className="gap-1.5 rounded-sm"
                                      >
                                        <Icon name="Trash2" size={14} />
                                        Удалить
                                      </Button>
                                    )}
                                  </div>

                                  {tab === 'letter' && (
                                    <div className="flex flex-col gap-1.5">
                                      <p className="text-[0.74em] uppercase tracking-[0.1em] text-muted-foreground">
                                        Ответы
                                      </p>
                                      {!reps.length ? (
                                        <p className="text-[0.82em] text-muted-foreground">
                                          Ответ ещё не отправлен.
                                        </p>
                                      ) : (
                                        reps.map((x) => (
                                          <div
                                            key={x.id}
                                            className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-secondary/30 px-3 py-2"
                                          >
                                            <Icon
                                              name="CornerDownRight"
                                              size={14}
                                              className="flex-none text-accent"
                                            />
                                            <span className="min-w-0 flex-1">
                                              <span className="block truncate text-[0.84em]">
                                                Исх. № {x.number} от {ruDate(x.replyDate)}
                                              </span>
                                              {(x.subject || x.note) && (
                                                <span className="block truncate text-[0.76em] text-muted-foreground">
                                                  {x.subject}
                                                  {x.note ? ` · ${x.note}` : ''}
                                                </span>
                                              )}
                                            </span>
                                            {x.fileUrl && (
                                              <a
                                                href={x.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={x.fileName}
                                                className="flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                                              >
                                                <Icon name="Paperclip" size={13} />
                                              </a>
                                            )}
                                            {!readOnly && (
                                              <button
                                                type="button"
                                                onClick={() => drop('reply', x.id)}
                                                className="flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                                              >
                                                <Icon name="X" size={13} />
                                              </button>
                                            )}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}

                                  {tab === 'protocol' && (
                                    <div className="flex flex-col gap-1.5">
                                      <p className="text-[0.74em] uppercase tracking-[0.1em] text-muted-foreground">
                                        Пункты протокола
                                      </p>
                                      {!pts.length ? (
                                        <p className="text-[0.82em] text-muted-foreground">
                                          Пункты не внесены.
                                        </p>
                                      ) : (
                                        pts.map((p) => (
                                          <div
                                            key={p.id}
                                            className="flex flex-col gap-1.5 rounded-sm border border-border bg-secondary/30 px-3 py-2"
                                          >
                                            <div className="flex items-start gap-2">
                                              <span className="w-6 flex-none font-head text-[0.82em] text-muted-foreground">
                                                {p.num}
                                              </span>
                                              <span className="min-w-0 flex-1 text-[0.84em]">
                                                {p.text}
                                                {p.responsible && (
                                                  <span className="block text-[0.9em] text-muted-foreground">
                                                    отв. {p.responsible}
                                                    {p.dueAt ? ` · до ${ruDate(p.dueAt)}` : ''}
                                                  </span>
                                                )}
                                                {p.statusNote && (
                                                  <span className="block text-[0.9em] text-muted-foreground">
                                                    {p.statusNote}
                                                  </span>
                                                )}
                                              </span>
                                              {!readOnly && (
                                                <button
                                                  type="button"
                                                  onClick={() => drop('point', p.id)}
                                                  className="flex h-6 w-6 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                                                >
                                                  <Icon name="X" size={12} />
                                                </button>
                                              )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                              {STATUS_ORDER.map((s) => (
                                                <button
                                                  key={s}
                                                  type="button"
                                                  disabled={readOnly}
                                                  onClick={() => setStatus(p, s)}
                                                  className={cn(
                                                    'rounded-sm border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em] transition-colors',
                                                    p.status === s
                                                      ? STATUS_TONE[s] + ' bg-card'
                                                      : 'border-border text-muted-foreground hover:border-accent',
                                                    readOnly && 'pointer-events-none',
                                                  )}
                                                >
                                                  {STATUS_LABEL[s]}
                                                </button>
                                              ))}
                                              {!readOnly && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setStatusFor(p);
                                                    setSNote(p.statusNote);
                                                  }}
                                                  className="rounded-sm border border-border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                                                >
                                                  комментарий
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              {tab === 'letter' ? 'Входящее письмо заказчика' : 'Протокол совещания'}
            </DialogTitle>
            <DialogDescription>
              {tab === 'letter'
                ? 'Письмо ляжет в свой месяц. Ответ добавите отдельно — статистика посчитается сама.'
                : 'Впишите пункты по одному в строке. Статусы будете менять в списке.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Номер
                </Label>
                <Input
                  value={f.number}
                  onChange={(e) => setF({ ...f, number: e.target.value })}
                  placeholder={tab === 'letter' ? 'ВХ-284' : 'ПР-12'}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Дата
                </Label>
                <Input
                  type="date"
                  value={f.letterDate}
                  onChange={(e) => setF({ ...f, letterDate: e.target.value })}
                  className="rounded-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                {tab === 'letter' ? 'От кого' : 'Кто проводил'}
              </Label>
              <Input
                value={f.sender}
                onChange={(e) => setF({ ...f, sender: e.target.value })}
                placeholder="ООО «Газпром добыча»"
                className="rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Тема
              </Label>
              <Input
                value={f.subject}
                onChange={(e) => setF({ ...f, subject: e.target.value })}
                placeholder="О предоставлении исполнительной документации"
                className="rounded-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Срок ответа
                </Label>
                <Input
                  type="date"
                  value={f.dueAt}
                  onChange={(e) => setF({ ...f, dueAt: e.target.value })}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Проект
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {projects.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setF({ ...f, fieldKey: f.fieldKey === p ? '' : p })}
                      className={cn(
                        'max-w-[12rem] truncate rounded-sm border px-2 py-1 text-[0.8em] transition-colors',
                        f.fieldKey === p
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      {p === NO_FIELD ? 'Без проекта' : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {tab === 'protocol' && (
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Пункты протокола — по одному в строке
                </Label>
                <Textarea
                  value={rawPoints}
                  onChange={(e) => setRawPoints(e.target.value)}
                  rows={5}
                  className="rounded-sm"
                  placeholder={'1. Предоставить ИД по свайному полю\n2. Устранить замечания по АКЗ'}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Скан документа
              </Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-left text-[0.84em] transition-colors hover:border-accent"
              >
                <Icon
                  name={file ? 'FileCheck' : 'Upload'}
                  size={17}
                  className="flex-none text-accent"
                />
                <span className="min-w-0 truncate">
                  {file ? file.name : 'Выбрать файл — PDF или скан'}
                </span>
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Примечание
              </Label>
              <Textarea
                value={f.note}
                onChange={(e) => setF({ ...f, note: e.target.value })}
                rows={2}
                className="rounded-sm"
              />
            </div>

            <Button
              onClick={save}
              disabled={busy}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'Check'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!replyFor} onOpenChange={(v) => !v && setReplyFor(null)}>
        <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Ответ на письмо
            </DialogTitle>
            <DialogDescription>
              Вх. № {replyFor?.number} от {ruDate(replyFor?.letterDate)} · {replyFor?.sender}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Исходящий №
                </Label>
                <Input
                  value={r.number}
                  onChange={(e) => setR({ ...r, number: e.target.value })}
                  placeholder="ИСХ-119"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Дата ответа
                </Label>
                <Input
                  type="date"
                  value={r.replyDate}
                  onChange={(e) => setR({ ...r, replyDate: e.target.value })}
                  className="rounded-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Тема
              </Label>
              <Input
                value={r.subject}
                onChange={(e) => setR({ ...r, subject: e.target.value })}
                className="rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Скан ответа
              </Label>
              <input
                ref={rFileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => setRFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => rFileRef.current?.click()}
                className="flex w-full items-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-left text-[0.84em] transition-colors hover:border-accent"
              >
                <Icon
                  name={rFile ? 'FileCheck' : 'Upload'}
                  size={17}
                  className="flex-none text-accent"
                />
                <span className="min-w-0 truncate">
                  {rFile ? rFile.name : 'Выбрать файл'}
                </span>
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Примечание
              </Label>
              <Textarea
                value={r.note}
                onChange={(e) => setR({ ...r, note: e.target.value })}
                rows={2}
                className="rounded-sm"
              />
            </div>

            <Button
              onClick={saveReply}
              disabled={busy}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'Check'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              {busy ? 'Сохраняем…' : 'Сохранить ответ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusFor} onOpenChange={(v) => !v && setStatusFor(null)}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Комментарий к пункту
            </DialogTitle>
            <DialogDescription>{statusFor?.text}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <Textarea
              value={sNote}
              onChange={(e) => setSNote(e.target.value)}
              rows={3}
              className="rounded-sm"
              placeholder="Что сделано, чего ждём, кто ответственный"
            />
            <Button
              onClick={saveStatusNote}
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

export default LettersCabinet;