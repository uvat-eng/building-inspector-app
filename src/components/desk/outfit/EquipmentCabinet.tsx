import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
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
import { useEquipment, daysLeft, fmt } from '@/data/outfit';

const EquipmentCabinet = () => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { current, users } = useUsers();
  const holderId = current?.id ?? '';
  const holderFio = current?.fio || profile.fio;

  const { items, loading, add, transfer, reload } = useEquipment(holderId);

  const [form, setForm] = useState(false);
  const [pass, setPass] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [invNo, setInvNo] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [condition, setCondition] = useState('');
  const [verifiedAt, setVerifiedAt] = useState('');
  const [verifiedTo, setVerifiedTo] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const [picked, setPicked] = useState<string[]>([]);
  const [toId, setToId] = useState('');
  const [passCondition, setPassCondition] = useState('');
  const [passPhotos, setPassPhotos] = useState<string[]>([]);

  const inspectors = users.filter(
    (u) => ['inspector', 'engineer'].includes(u.role) && u.id !== holderId,
  );

  const shoot = async (files: FileList | null, set: (v: string[]) => void, prev: string[]) => {
    if (!files?.length) return;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, 4)) out.push(await compressPhoto(f));
    set([...prev, ...out].slice(0, 6));
  };

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
        invNo: invNo.trim(),
        serialNo: serialNo.trim(),
        condition: condition.trim(),
        verifiedAt,
        verifiedTo,
        photos,
      });
      setTitle('');
      setInvNo('');
      setSerialNo('');
      setCondition('');
      setVerifiedAt('');
      setVerifiedTo('');
      setPhotos([]);
      setForm(false);
      toast({ title: 'Оборудование принято', description: 'Числится за вами до передачи' });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const doTransfer = async () => {
    const to = inspectors.find((u) => u.id === toId);
    if (!picked.length) {
      toast({ title: 'Отметьте, что передаёте', variant: 'destructive' });
      return;
    }
    if (!to) {
      toast({ title: 'Выберите, кому передаёте', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await transfer({
        equipmentIds: picked,
        fromId: holderId,
        fromFio: holderFio,
        toId: to.id,
        toFio: to.fio,
        condition: passCondition.trim(),
        photos: passPhotos,
      });
      setPicked([]);
      setToId('');
      setPassCondition('');
      setPassPhotos([]);
      setPass(false);
      await reload();
      toast({
        title: 'Оборудование передано',
        description: `${to.fio} · проводка сохранена в истории`,
      });
    } catch {
      toast({ title: 'Не удалось передать', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="grid flex-none gap-2 sm:grid-cols-2">
        <Button
          onClick={() => setForm(true)}
          className="h-12 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name="Plus" size={17} />
          Принять оборудование
        </Button>
        <Button
          variant="outline"
          onClick={() => setPass(true)}
          className="h-12 gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
        >
          <Icon name="ArrowLeftRight" size={17} className="text-accent" />
          Передать по окончанию вахты
        </Button>
      </div>

      <Panel title="Оборудование за мной" note={`${items.length}`}>
        {loading ? (
          <Empty icon="Loader2" title="Загрузка…" hint="Собираем список оборудования." />
        ) : items.length === 0 ? (
          <Empty
            icon="Wrench"
            title="Оборудования нет"
            hint="Внесите то, что передали при заезде на вахту."
          />
        ) : (
          items.map((e) => {
            const d = daysLeft(e.verifiedTo);
            return (
              <div key={e.id} className="border-b border-border/60 px-4 py-3 last:border-b-0">
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.96em]">{e.title}</span>
                    <span className="block truncate text-[0.8em] text-muted-foreground">
                      {[
                        e.invNo && `инв. № ${e.invNo}`,
                        e.serialNo && `зав. № ${e.serialNo}`,
                        `принято ${fmt(e.receivedAt)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {e.condition && (
                      <span className="mt-1 block text-[0.82em]">Состояние: {e.condition}</span>
                    )}
                    {e.verifiedTo && (
                      <span className="block text-[0.8em] text-muted-foreground">
                        Поверка до {fmt(e.verifiedTo)}
                      </span>
                    )}
                  </span>
                  {e.verifiedTo && (
                    <Tag tone={d !== null && d <= 0 ? 'hot' : d !== null && d <= 30 ? 'wait' : 'ok'}>
                      {d !== null && d <= 0 ? 'поверка' : `${d} дн.`}
                    </Tag>
                  )}
                </div>
                {e.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.photos.map((p) => (
                      <img
                        key={p}
                        src={p}
                        alt={e.title}
                        className="h-14 w-14 rounded-sm object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>

      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="max-w-lg rounded-sm border-t-2 border-t-accent">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Оборудование при заезде
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Опишите состояние, укажите даты поверки и приложите фото.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Наименование</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Нивелир, толщиномер, рулетка 30 м"
                className="rounded-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[0.78em] uppercase tracking-[0.08em]">Инв. №</Label>
                <Input value={invNo} onChange={(e) => setInvNo(e.target.value)} className="rounded-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[0.78em] uppercase tracking-[0.08em]">Заводской №</Label>
                <Input
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  className="rounded-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[0.78em] uppercase tracking-[0.08em]">Поверка от</Label>
                <Input
                  type="date"
                  value={verifiedAt}
                  onChange={(e) => setVerifiedAt(e.target.value)}
                  className="rounded-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[0.78em] uppercase tracking-[0.08em]">Поверка до</Label>
                <Input
                  type="date"
                  value={verifiedTo}
                  onChange={(e) => setVerifiedTo(e.target.value)}
                  className="rounded-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Состояние</Label>
              <Textarea
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                rows={3}
                placeholder="Рабочее, футляр в комплекте, потёртость корпуса"
                className="resize-none rounded-sm text-[0.9em]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-3 py-2 text-[0.82em] transition-colors hover:border-accent">
                <Icon name="Camera" size={16} className="text-accent" />
                Фото оборудования
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => shoot(e.target.files, setPhotos, photos)}
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
              <Button variant="outline" className="flex-1 rounded-sm" onClick={() => setForm(false)}>
                Отмена
              </Button>
              <Button
                disabled={busy}
                onClick={save}
                className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon name={busy ? 'Loader2' : 'Check'} size={16} className={busy ? 'animate-spin' : ''} />
                Принять
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pass} onOpenChange={setPass}>
        <DialogContent className="max-w-lg rounded-sm border-t-2 border-t-accent">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Передача оборудования
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Отметьте позиции и выберите инспектора, который принимает вахту.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="scrollbar-thin max-h-[28vh] overflow-y-auto rounded-sm border border-border">
              {items.length === 0 ? (
                <p className="p-3 text-[0.85em] text-muted-foreground">Передавать нечего.</p>
              ) : (
                items.map((e) => (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 hover:bg-secondary/60"
                  >
                    <input
                      type="checkbox"
                      checked={picked.includes(e.id)}
                      onChange={(ev) =>
                        setPicked((p) =>
                          ev.target.checked ? [...p, e.id] : p.filter((x) => x !== e.id),
                        )
                      }
                      className="h-4 w-4 flex-none accent-[hsl(var(--accent))]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.92em]">{e.title}</span>
                      <span className="block truncate text-[0.78em] text-muted-foreground">
                        {e.invNo ? `инв. № ${e.invNo}` : 'без инв. номера'}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">Кому передаём</Label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className={cn(
                  'h-10 rounded-sm border border-border bg-card px-2 text-[0.9em]',
                  !toId && 'text-muted-foreground',
                )}
              >
                <option value="">Выберите инспектора</option>
                {inspectors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fio} · {u.group || 'группа не назначена'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.78em] uppercase tracking-[0.08em]">
                Состояние на момент передачи
              </Label>
              <Textarea
                value={passCondition}
                onChange={(e) => setPassCondition(e.target.value)}
                rows={2}
                placeholder="Комплектность полная, замечаний нет"
                className="resize-none rounded-sm text-[0.9em]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-border px-3 py-2 text-[0.82em] transition-colors hover:border-accent">
                <Icon name="Camera" size={16} className="text-accent" />
                Фото при передаче
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => shoot(e.target.files, setPassPhotos, passPhotos)}
                />
              </label>
              {passPhotos.map((p, k) => (
                <img
                  key={p.slice(-24)}
                  src={p}
                  alt={`фото ${k + 1}`}
                  className="h-11 w-11 rounded-sm object-cover"
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-sm" onClick={() => setPass(false)}>
                Отмена
              </Button>
              <Button
                disabled={busy}
                onClick={doTransfer}
                className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon
                  name={busy ? 'Loader2' : 'ArrowLeftRight'}
                  size={16}
                  className={busy ? 'animate-spin' : ''}
                />
                Передать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentCabinet;
