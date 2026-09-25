import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
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
import { compressPhoto } from '@/data/photoQueue';
import { useProfile } from '@/data/profile';
import { useUsers } from '@/data/users';
import {
  usePpe,
  useWriteoffs,
  PPE_PRESET,
  SEASON_LABEL,
  SEASON_MONTHS,
  Season,
  daysLeft,
  fmt,
} from '@/data/outfit';
import { buildSheetHtml, buildWriteoffActHtml, printHtml } from '@/lib/ppeDoc';

const STATUS_LABEL: Record<string, string> = {
  review: 'У старшего инженера',
  approval: 'У руководителя проекта',
  done: 'Списано',
  declined: 'Отклонено',
};

const PpeCabinet = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { current } = useUsers();
  const holderId = current?.id ?? '';
  const holderFio = current?.fio || profile.fio;

  const { items, loading, add, reload } = usePpe(holderId);
  const { items: writeoffs, create: createWriteoff } = useWriteoffs(holderId);

  const [form, setForm] = useState(false);
  const [wf, setWf] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [season, setSeason] = useState<Season>('summer');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState('1');
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().slice(0, 10));

  const [picked, setPicked] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const active = items.filter((i) => i.status !== 'writeoff');
  const soon = useMemo(
    () =>
      active.filter((i) => {
        const d = daysLeft(i.expiresAt);
        return d !== null && d <= 30;
      }),
    [active],
  );

  const save = async () => {
    if (!title.trim()) {
      toast({ title: 'Укажите наименование', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await add({
        holderId,
        holderFio,
        title: title.trim(),
        season,
        size: size.trim(),
        qty: Number(qty) || 1,
        issuedAt,
        wearMonths: SEASON_MONTHS[season],
      });
      setTitle('');
      setSize('');
      setQty('1');
      setForm(false);
      toast({ title: 'Позиция принята на учёт' });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, 4)) out.push(await compressPhoto(f));
    setPhotos((p) => [...p, ...out].slice(0, 6));
  };

  const sendWriteoff = async () => {
    if (!picked.length) {
      toast({ title: 'Отметьте, что списываем', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Укажите причину списания', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createWriteoff({
        holderId,
        holderFio,
        itemIds: picked,
        reason: reason.trim(),
        photos,
      });
      setPicked([]);
      setReason('');
      setPhotos([]);
      setWf(false);
      await reload();
      toast({
        title: 'Заявка на списание отправлена',
        description: 'Согласование: старший инженер → руководитель проекта',
      });
    } catch {
      toast({ title: 'Не удалось отправить заявку', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const printSheet = () => {
    printHtml(buildSheetHtml(items, holderFio, profile.org), 'Ведомость спецодежды');
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="grid flex-none gap-2 sm:grid-cols-3">
        <Button
          onClick={() => setForm(true)}
          className="h-12 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name="Plus" size={17} />
          Внести позицию
        </Button>
        <Button
          variant="outline"
          onClick={printSheet}
          className="h-12 gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
        >
          <Icon name="Printer" size={17} className="text-accent" />
          Печать ведомости
        </Button>
        <Button
          variant="outline"
          onClick={() => setWf(true)}
          className="h-12 gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
        >
          <Icon name="Trash2" size={17} className="text-accent" />
          Списать спецодежду
        </Button>
      </div>

      {soon.length > 0 && (
        <div className="flex flex-none items-start gap-2 rounded-sm border border-warning/40 bg-warning/10 px-3 py-2.5 text-[0.84em]">
          <Icon name="BellRing" size={16} className="mt-0.5 flex-none text-warning" />
          <span>
            Пора списывать: {soon.map((i) => i.title).join(', ')} — срок носки заканчивается.
          </span>
        </div>
      )}

      <Panel title="Спецодежда в носке" note={`${active.length}`}>
        {loading ? (
          <Empty icon="Loader2" title="Загрузка…" hint="Собираем карточку СИЗ." />
        ) : active.length === 0 ? (
          <Empty
            icon="Shirt"
            title="Позиций нет"
            hint="Внесите то, что получили на складе, с датой выдачи."
          />
        ) : (
          active.map((i) => {
            const d = daysLeft(i.expiresAt);
            const tone = i.status === 'pending' ? 'dim' : d !== null && d <= 0 ? 'hot' : d !== null && d <= 30 ? 'wait' : 'ok';
            return (
              <Row
                key={i.id}
                title={`${i.title}${i.size ? ` · разм. ${i.size}` : ''}`}
                sub={`${SEASON_LABEL[i.season]} · выдано ${fmt(i.issuedAt)} · срок носки ${i.wearMonths} мес. · до ${fmt(i.expiresAt)}`}
                right={
                  <Tag tone={tone}>
                    {i.status === 'pending'
                      ? 'на списании'
                      : d === null
                        ? '—'
                        : d <= 0
                          ? 'списать'
                          : `${d} дн.`}
                  </Tag>
                }
                onClick={() => undefined}
              />
            );
          })
        )}
      </Panel>

      <Panel title="Заявки на списание" note={`${writeoffs.length}`}>
        {writeoffs.length === 0 ? (
          <Empty
            icon="FileMinus"
            title="Заявок нет"
            hint="Списание проходит согласование старшего инженера и руководителя проекта."
          />
        ) : (
          writeoffs.map((w) => (
            <div key={w.id} className="border-b border-border/60 px-4 py-3 last:border-b-0">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.95em]">
                    {w.items.map((i) => i.title).join(', ') || 'Позиции'}
                  </span>
                  <span className="block truncate text-[0.8em] text-muted-foreground">
                    {fmt(w.createdAt)} · {w.reason}
                  </span>
                </span>
                <Tag tone={w.status === 'done' ? 'ok' : w.status === 'declined' ? 'hot' : 'wait'}>
                  {STATUS_LABEL[w.status]}
                </Tag>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.78em] text-muted-foreground">
                <span className={cn(w.engineerFio && 'text-success')}>
                  1. Старший инженер {w.engineerFio ? `· ${w.engineerFio}` : '· ожидание'}
                </span>
                <span className={cn(w.managerFio && 'text-success')}>
                  2. Руководитель {w.managerFio ? `· ${w.managerFio}` : '· ожидание'}
                </span>
                {w.status === 'done' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto h-8 gap-1.5 rounded-sm"
                    onClick={() =>
                      printHtml(
                        buildWriteoffActHtml(w, profile.org),
                        `Акт списания № ${w.actNo}`,
                      )
                    }
                  >
                    <Icon name="Printer" size={14} className="text-accent" />
                    Акт списания № {w.actNo}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </Panel>

      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="max-w-md rounded-sm border-t-2 border-t-accent">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Полученная спецодежда
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Срок носки подставляется автоматически: зима — 2 года, лето — 1 год.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Наименование</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                list="ppe-preset"
                placeholder="Костюм утеплённый зимний"
                className="rounded-sm"
              />
              <datalist id="ppe-preset">
                {PPE_PRESET.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Сезон</Label>
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm bg-border">
                {(['winter', 'summer', 'all'] as Season[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeason(s)}
                    className={cn(
                      'bg-card px-2 py-2.5 text-[0.82em] transition-colors',
                      season === s ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary',
                    )}
                  >
                    {SEASON_LABEL[s]}
                    <span className="block text-[0.78em] opacity-70">
                      {SEASON_MONTHS[s]} мес.
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[0.78em] uppercase tracking-[0.08em]">Размер</Label>
                <Input value={size} onChange={(e) => setSize(e.target.value)} className="rounded-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[0.78em] uppercase tracking-[0.08em]">Кол-во</Label>
                <Input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="rounded-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[0.78em] uppercase tracking-[0.08em]">Получено</Label>
                <Input
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  className="rounded-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-sm" onClick={() => setForm(false)}>
                Отмена
              </Button>
              <Button
                disabled={busy}
                onClick={save}
                className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon name={busy ? 'Loader2' : 'Check'} size={16} className={busy ? 'animate-spin' : ''} />
                Принять на учёт
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={wf} onOpenChange={setWf}>
        <DialogContent className="max-w-lg rounded-sm border-t-2 border-t-accent">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Списание спецодежды
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Отметьте позиции, укажите причину и приложите фото. Заявка уйдёт на согласование.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="scrollbar-thin max-h-[32vh] overflow-y-auto rounded-sm border border-border">
              {items.filter((i) => i.status === 'active').length === 0 ? (
                <p className="p-3 text-[0.85em] text-muted-foreground">Списывать нечего.</p>
              ) : (
                items
                  .filter((i) => i.status === 'active')
                  .map((i) => (
                    <label
                      key={i.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 hover:bg-secondary/60"
                    >
                      <input
                        type="checkbox"
                        checked={picked.includes(i.id)}
                        onChange={(e) =>
                          setPicked((p) =>
                            e.target.checked ? [...p, i.id] : p.filter((x) => x !== i.id),
                          )
                        }
                        className="h-4 w-4 flex-none accent-[hsl(var(--accent))]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.92em]">{i.title}</span>
                        <span className="block truncate text-[0.78em] text-muted-foreground">
                          {SEASON_LABEL[i.season]} · выдано {fmt(i.issuedAt)}
                        </span>
                      </span>
                    </label>
                  ))
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Причина списания</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Износ, порыв ткани, срок носки истёк"
                className="resize-none rounded-sm text-[0.9em]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-3 py-2 text-[0.82em] transition-colors hover:border-accent">
                <Icon name="Camera" size={16} className="text-accent" />
                Добавить фото
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
              {photos.map((p, k) => (
                <img
                  key={p.slice(-24)}
                  src={p}
                  alt={`фото ${k + 1}`}
                  className="h-11 w-11 rounded-sm object-cover"
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-sm" onClick={() => setWf(false)}>
                Отмена
              </Button>
              <Button
                disabled={busy}
                onClick={sendWriteoff}
                className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon name={busy ? 'Loader2' : 'Send'} size={16} className={busy ? 'animate-spin' : ''} />
                Списать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PpeCabinet;