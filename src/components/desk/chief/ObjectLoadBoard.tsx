import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
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
import { cn } from '@/lib/utils';
import { useObjects, ProjectObject } from '@/data/store';
import { useUsers, User } from '@/data/users';
import { useVehicles, Vehicle, KIND_LABEL } from '@/data/vehicles';
import { ROLE_LABEL } from '@/data/profile';

interface ObjectLoadBoardProps {
  objects: ProjectObject[];
  canEdit: boolean;
  title?: string;
  note?: string;
}

const barTone = (plan: number, fact: number) =>
  plan === 0 ? 'dim' : fact >= plan ? 'ok' : fact >= plan * 0.7 ? 'wait' : 'hot';

const TONE_CLASS: Record<string, string> = {
  ok: 'bg-accent',
  wait: 'bg-amber-500',
  hot: 'bg-destructive',
  dim: 'bg-border',
};

const ObjectLoadBoard = ({ objects, canEdit, title, note }: ObjectLoadBoardProps) => {
  const { toast } = useToast();
  const { update } = useObjects();
  const { users } = useUsers();
  const { items: assets } = useVehicles();

  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<ProjectObject | null>(null);
  const [form, setForm] = useState({
    staffPlan: '0',
    staffFact: '0',
    techPlan: '0',
    techFact: '0',
    cabins: '0',
  });
  const [busy, setBusy] = useState(false);

  const peopleOn = useMemo(() => {
    const map = new Map<string, User[]>();
    (users ?? []).forEach((u: User) => {
      (u.objects ?? []).forEach((id) => map.set(id, [...(map.get(id) ?? []), u]));
    });
    return map;
  }, [users]);

  const techOn = useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    (assets ?? []).forEach((v: Vehicle) => {
      if (!v.objectId) return;
      map.set(v.objectId, [...(map.get(v.objectId) ?? []), v]);
    });
    return map;
  }, [assets]);

  const totals = useMemo(
    () =>
      objects.reduce(
        (a, o) => ({
          staffPlan: a.staffPlan + (o.staffPlan || 0),
          staffFact: a.staffFact + (o.staffFact || 0),
          techPlan: a.techPlan + (o.techPlan || 0),
          techFact: a.techFact + (o.techFact || 0),
        }),
        { staffPlan: 0, staffFact: 0, techPlan: 0, techFact: 0 },
      ),
    [objects],
  );

  const startEdit = (o: ProjectObject) => {
    setForm({
      staffPlan: String(o.staffPlan ?? 0),
      staffFact: String(o.staffFact ?? 0),
      techPlan: String(o.techPlan ?? 0),
      techFact: String(o.techFact ?? 0),
      cabins: String(o.cabins ?? 0),
    });
    setEdit(o);
  };

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      await update(edit.id, {
        staffPlan: Number(form.staffPlan) || 0,
        staffFact: Number(form.staffFact) || 0,
        techPlan: Number(form.techPlan) || 0,
        techFact: Number(form.techFact) || 0,
        cabins: Number(form.cabins) || 0,
      });
      setEdit(null);
      toast({ title: 'Данные обновлены', description: edit.title });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const bar = (plan: number, fact: number) => {
    const pct = plan > 0 ? Math.min(100, Math.round((fact / plan) * 100)) : 0;
    return (
      <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-sm bg-secondary">
        <span
          className={cn('block h-full transition-all', TONE_CLASS[barTone(plan, fact)])}
          style={{ width: `${pct}%` }}
        />
      </span>
    );
  };

  const pair = (label: string, icon: string, plan: number, fact: number) => (
    <span className="min-w-0 flex-1">
      <span className="flex items-baseline gap-1.5 text-[0.78em]">
        <Icon name={icon} fallback="Circle" size={13} className="translate-y-0.5 text-accent" />
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="ml-auto font-head">
          {fact} / {plan}
        </span>
      </span>
      {bar(plan, fact)}
    </span>
  );

  return (
    <>
      <Panel
        title={title ?? 'Люди и техника на объектах'}
        note={note ?? `факт ${totals.staffFact} / план ${totals.staffPlan} чел.`}
      >
        {objects.length === 0 ? (
          <Empty
            icon="Building2"
            title="Объектов нет"
            hint="Появятся после закрепления руководителем проекта."
          />
        ) : (
          <>
            {objects.map((o) => {
              const people = peopleOn.get(o.id) ?? [];
              const tech = techOn.get(o.id) ?? [];
              return (
                <div key={o.id} className="border-b border-border last:border-b-0">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setOpen((p) => (p === o.id ? null : o.id))}
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent transition-colors hover:bg-border"
                    >
                      <Icon name={open === o.id ? 'ChevronDown' : 'Building2'} size={16} />
                    </button>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-head text-[0.92em] uppercase tracking-[0.03em]">
                        {o.title}
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
                        {pair('Люди', 'Users', o.staffPlan || 0, o.staffFact || 0)}
                        {pair('Техника', 'Truck', o.techPlan || 0, o.techFact || 0)}
                      </span>
                    </span>

                    {canEdit && (
                      <button
                        type="button"
                        title="Внести факт"
                        onClick={() => startEdit(o)}
                        className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                      >
                        <Icon name="Pencil" size={14} />
                      </button>
                    )}
                  </div>

                  {open === o.id && (
                    <div className="grid gap-3 border-t border-border/50 px-4 py-3 pl-16 sm:grid-cols-2">
                      <div>
                        <p className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
                          Люди на объекте ({people.length})
                        </p>
                        {people.length === 0 ? (
                          <p className="mt-1 text-[0.82em] text-muted-foreground">
                            Никто не закреплён
                          </p>
                        ) : (
                          <ul className="mt-1 space-y-0.5 text-[0.84em]">
                            {people.map((u) => (
                              <li key={u.id} className="truncate">
                                {u.fio}
                                <span className="text-muted-foreground">
                                  {' '}
                                  · {ROLE_LABEL[u.role]}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <p className="text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
                          Техника на объекте ({tech.length})
                        </p>
                        {tech.length === 0 ? (
                          <p className="mt-1 text-[0.82em] text-muted-foreground">
                            Техника не закреплена
                          </p>
                        ) : (
                          <ul className="mt-1 space-y-0.5 text-[0.84em]">
                            {tech.map((v) => (
                              <li key={v.id} className="truncate">
                                {v.model || v.invNo || 'Без названия'}
                                <span className="text-muted-foreground">
                                  {' '}
                                  ·{' '}
                                  {v.assetType === 'vehicle'
                                    ? `${KIND_LABEL[v.kind]}${v.plate ? `, ${v.plate}` : ''}`
                                    : v.assetType === 'cabin'
                                      ? 'Вагон-дом'
                                      : 'Прибор'}
                                  {v.status ? ` · ${v.status}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <p className="text-[0.8em] text-muted-foreground sm:col-span-2">
                        Вагоны и бытовки: {o.cabins || 0} · этап: {o.stage || '—'} · готовность{' '}
                        {o.progress || 0}%
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-center gap-3 bg-secondary/40 px-4 py-2.5 text-[0.84em]">
              <span className="font-head uppercase tracking-[0.06em]">Итого по объектам</span>
              <span className="ml-auto">
                люди{' '}
                <span className="font-head">
                  {totals.staffFact} / {totals.staffPlan}
                </span>
              </span>
              <span>
                техника{' '}
                <span className="font-head">
                  {totals.techFact} / {totals.techPlan}
                </span>
              </span>
            </div>
          </>
        )}
      </Panel>

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-w-md rounded-sm border-t-2 border-t-accent">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.1em] uppercase tracking-[0.03em]">
              Люди и техника · {edit?.title}
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              План берётся из договора, факт вносите ежедневно.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['staffPlan', 'Людей по плану'],
                ['staffFact', 'Людей фактически'],
                ['techPlan', 'Техники по плану'],
                ['techFact', 'Техники фактически'],
                ['cabins', 'Вагонов и бытовок'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                  {label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="h-9 rounded-sm text-[0.88em]"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-sm" onClick={() => setEdit(null)}>
              Отмена
            </Button>
            <Button
              disabled={busy}
              onClick={save}
              className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'Check'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ObjectLoadBoard;
