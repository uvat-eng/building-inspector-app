import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUsers, updateUser, User } from '@/data/users';
import { useLocations } from '@/data/locations';
import { Vehicle } from '@/data/vehicles';
import { money, ruDate, useFleet, activeShift } from '@/data/fleet';

interface DriverActivityProps {
  vehicles: Vehicle[];
}

interface Entry {
  at: string;
  icon: string;
  text: string;
  sub: string;
}

const DriverActivity = ({ vehicles }: DriverActivityProps) => {
  const { toast } = useToast();
  const { users, reload } = useUsers();
  const { list: locations } = useLocations();
  const { shifts, repairs, expenses, acts, loading } = useFleet();

  const [locFor, setLocFor] = useState<User | null>(null);
  const [locSel, setLocSel] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const drivers = useMemo(() => users.filter((u: User) => u.role === 'driver'), [users]);

  const openLocs = (d: User) => {
    setLocSel(d.locations ?? []);
    setLocFor(d);
  };

  const toggle = (id: string) =>
    setLocSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const saveLocs = async () => {
    if (!locFor) return;
    setSaving(true);
    try {
      await updateUser(locFor.id, { locations: locSel });
      toast({ title: 'Локации водителя обновлены' });
      setLocFor(null);
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const vTitle = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    return v ? `${v.plate || 'б/н'} · ${v.model}` : 'техника не указана';
  };

  const rows = useMemo(
    () =>
      drivers.map((d) => {
        const my = {
          repairs: repairs.filter((r) => r.author === d.fio),
          expenses: expenses.filter((e) => e.driverFio === d.fio || e.author === d.fio),
          acts: acts.filter((a) => a.driverFio === d.fio || a.author === d.fio),
          shifts: shifts.filter((s) => s.driverFio === d.fio),
        };
        const current = my.shifts.find((s) => activeShift(shifts, s.vehicleId)?.id === s.id);
        const feed: Entry[] = [
          ...my.repairs.map((r) => ({
            at: r.createdAt || r.repairDate,
            icon: 'Wrench',
            text: `Ремонт: ${r.title || 'без названия'} · ${money(r.amount)} ₽`,
            sub: `${vTitle(r.vehicleId)} · ${ruDate(r.repairDate)}`,
          })),
          ...my.expenses.map((e) => ({
            at: e.createdAt || e.expDate,
            icon: 'ReceiptText',
            text: `Авансовый отчёт: ${e.title} · ${money(e.amount)} ₽`,
            sub: `${vTitle(e.vehicleId)} · ${ruDate(e.expDate)}`,
          })),
          ...my.acts.map((a) => ({
            at: a.createdAt || a.actDate,
            icon: a.kind === 'writeoff' ? 'ClipboardList' : 'FileText',
            text:
              a.kind === 'writeoff'
                ? `Ведомость списания № ${a.actNo || '—'}`
                : `Акт передачи вахты № ${a.actNo || '—'}`,
            sub: `${vTitle(a.vehicleId)} · позиций ${a.items?.length ?? 0} · ${ruDate(a.actDate)}`,
          })),
        ].sort((x, y) => (y.at || '').localeCompare(x.at || ''));

        return {
          driver: d,
          current,
          spent: my.expenses.reduce((s, e) => s + (e.amount || 0), 0),
          feed: feed.slice(0, 8),
          total: feed.length,
        };
      }),
    [drivers, repairs, expenses, acts, shifts, vehicles],
  );

  if (loading && !drivers.length) {
    return <Empty icon="Loader" title="Загружаем" hint="Секунду." />;
  }

  if (!drivers.length) {
    return (
      <Empty
        icon="Users"
        title="Водителей пока нет"
        hint="Создайте водителя — здесь появятся все его действия."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { l: 'Водителей', v: String(drivers.length), i: 'Users' },
          {
            l: 'На вахте сейчас',
            v: String(rows.filter((r) => r.current).length),
            i: 'UserCheck',
          },
          { l: 'Записей внесено', v: String(rows.reduce((s, r) => s + r.total, 0)), i: 'History' },
          {
            l: 'Подотчёт всего, ₽',
            v: money(rows.reduce((s, r) => s + r.spent, 0)),
            i: 'Wallet',
          },
        ].map((c) => (
          <div
            key={c.l}
            className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={c.i} fallback="Circle" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-head text-[1.15em] leading-none">{c.v}</span>
              <span className="mt-1 block truncate text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.l}
              </span>
            </span>
          </div>
        ))}
      </div>

      <Panel
        title="Кто на какой технике и что внёс"
        note={`${drivers.length} чел.`}
        className="min-h-0 flex-1"
      >
        <div className="scrollbar-thin h-full overflow-y-auto">
          <div className="flex flex-col divide-y divide-border">
            {rows.map((r) => (
              <div key={r.driver.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'flex h-9 w-9 flex-none items-center justify-center rounded-sm',
                      r.current ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    <Icon name={r.current ? 'UserCheck' : 'UserX'} size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-head text-[0.92em] uppercase tracking-[0.03em]">
                      {r.driver.fio}
                    </span>
                    <span className="block truncate text-[0.76em] text-muted-foreground">
                      {r.current
                        ? `${vTitle(r.current.vehicleId)} · вахта ${ruDate(r.current.startAt)} — ${ruDate(r.current.endAt) || '…'}`
                        : 'техника не закреплена'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openLocs(r.driver)}
                    className="flex flex-none items-center gap-1 rounded-sm border border-border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon name="MapPin" size={12} />
                    локации
                  </button>
                  <span className="flex-none rounded-sm border border-border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em] text-muted-foreground">
                    записей {r.total}
                  </span>
                </div>

                <p className="pl-11 text-[0.74em] text-muted-foreground">
                  доступ:{' '}
                  {r.driver.locations?.length
                    ? r.driver.locations
                        .map((id) => locations.find((l) => l.id === id)?.title || id)
                        .join(', ')
                    : 'локации не закреплены'}
                </p>

                {!r.feed.length ? (
                  <p className="pl-11 text-[0.8em] text-muted-foreground">
                    Пока ничего не вносил.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1 pl-11">
                    {r.feed.map((e, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Icon
                          name={e.icon}
                          fallback="Circle"
                          size={13}
                          className="mt-0.5 flex-none text-accent"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.82em]">{e.text}</span>
                          <span className="block truncate text-[0.74em] text-muted-foreground">
                            {e.sub}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Dialog open={!!locFor} onOpenChange={(v) => !v && setLocFor(null)}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
              Локации водителя
            </DialogTitle>
            <DialogDescription>
              {locFor?.fio} · доступ откроется только к отмеченным локациям.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5">
            <div className="flex flex-wrap gap-1.5">
              {locations.map((l) => {
                const on = locSel.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggle(l.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[0.8em] transition-colors',
                      on
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-input hover:bg-secondary',
                    )}
                  >
                    <Icon name={l.icon} fallback="MapPin" size={13} />
                    {l.title}
                  </button>
                );
              })}
            </div>
            {!locSel.length && (
              <p className="text-[0.78em] text-destructive">
                Без локаций водитель не сможет войти ни в один проект.
              </p>
            )}
            <Button
              onClick={saveLocs}
              disabled={saving}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={saving ? 'Loader2' : 'Check'}
                size={16}
                className={saving ? 'animate-spin' : ''}
              />
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverActivity;