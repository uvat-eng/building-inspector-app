import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Empty from '@/components/desk/Empty';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/data/profile';
import { useUsers } from '@/data/users';
import CabinetBar from '@/components/desk/CabinetBar';
import ChangePassword from '@/components/desk/ChangePassword';
import useBackGuard from '@/hooks/use-back-guard';
import VehicleForm from '@/components/desk/mechanic/VehicleForm';
import { downloadWaybills } from '@/lib/waybillXls';
import LogDialog from '@/components/desk/mechanic/LogDialog';
import VehicleCard from '@/components/desk/mechanic/VehicleCard';
import FleetMap from '@/components/desk/mechanic/FleetMap';
import FleetTiles from '@/components/desk/mechanic/FleetTiles';
import DriverForm from '@/components/desk/mechanic/DriverForm';
import RepairsCabinet from '@/components/desk/mechanic/RepairsCabinet';
import VehicleDossier from '@/components/desk/mechanic/VehicleDossier';
import DriverActivity from '@/components/desk/mechanic/DriverActivity';
import { useFleet } from '@/data/fleet';
import {
  LogKind,
  Vehicle,
  VehicleDraft,
  VehicleStatus,
  daysLeft,
  useVehicles,
} from '@/data/vehicles';

interface MechanicCabinetProps {
  onExit?: () => void;
}

const MechanicCabinet = ({ onExit }: MechanicCabinetProps) => {
  const { profile } = useProfile();
  const { current } = useUsers();
  const { toast } = useToast();
  const { items, logs, create, update, remove, addLog, removeLog } = useVehicles();

  const [openVehicle, setOpenVehicle] = useState<string | null>(null);
  const [passOpen, setPassOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [logKind, setLogKind] = useState<LogKind | null>(null);
  const [driverOpen, setDriverOpen] = useState(false);
  const [pane, setPane] = useState<'repairs' | 'dossier' | 'drivers' | null>(null);
  const [pickedLoc, setPickedLoc] = useState<string | null>(null);
  const { shifts, reload: reloadFleet } = useFleet();

  useBackGuard(!!openVehicle, () => setOpenVehicle(null));

  const active = items.find((v) => v.id === openVehicle) ?? null;
  const activeLogs = useMemo(
    () => logs.filter((l) => l.vehicleId === openVehicle).slice(0, 60),
    [logs, openVehicle],
  );

  const alerts = useMemo(
    () =>
      items
        .map((v) => {
          const service = daysLeft(v.serviceAt);
          const osago = daysLeft(v.osagoTo);
          const reasons: string[] = [];
          if (service !== null && service <= 7)
            reasons.push(service < 0 ? `ТО просрочено на ${-service} дн.` : `ТО через ${service} дн.`);
          if (osago !== null && osago <= 30)
            reasons.push(
              osago < 0 ? `ОСАГО просрочено на ${-osago} дн.` : `ОСАГО истекает через ${osago} дн.`,
            );
          return { vehicle: v, reasons, overdue: (service ?? 1) < 0 || (osago ?? 1) < 0 };
        })
        .filter((a) => a.reasons.length),
    [items],
  );

  const shown = useMemo(
    () => (pickedLoc === null ? items : items.filter((v) => (v.locationId || '') === pickedLoc)),
    [items, pickedLoc],
  );

  const soonService = useMemo(() => {
    const now = new Date();
    const limit = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      .toISOString()
      .slice(0, 10);
    return items
      .filter((v) => v.serviceAt && v.serviceAt <= limit)
      .sort((a, b) => a.serviceAt.localeCompare(b.serviceAt));
  }, [items]);

  const onLine = items.filter((v) => v.status === 'На линии').length;
  const inService = items.filter((v) => v.status === 'ТО' || v.status === 'Ремонт').length;
  const waybills = logs.filter((l) => l.kind === 'waybill').length;

  const openForm = (v: Vehicle | null) => {
    setEditing(v);
    setFormOpen(true);
  };

  const submitForm = async (draft: VehicleDraft) => {
    try {
      if (editing) {
        await update(editing.id, {
          plate: draft.plate,
          model: draft.model,
          kind: draft.vehicleKind ?? editing.kind,
          driver: draft.driver ?? '',
          odometer: draft.odometer ?? 0,
          fuelNorm: draft.fuelNorm ?? 0,
          serviceAt: draft.serviceAt ?? '',
          osagoTo: draft.osagoTo ?? '',
          note: draft.note ?? '',
        });
        toast({ title: 'Данные техники обновлены' });
      } else {
        const item = await create({ ...draft, createdBy: profile.fio });
        toast({ title: 'Техника добавлена', description: `${item.plate} · ${item.model}` });
      }
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    }
  };

  const setStatus = async (status: VehicleStatus) => {
    if (!active) return;
    try {
      await update(active.id, { status });
      toast({ title: `Статус: ${status}` });
    } catch {
      toast({ title: 'Не удалось изменить статус', variant: 'destructive' });
    }
  };

  const saveLog = async (payload: {
    date: string;
    odometer: number;
    amount: number;
    content: string;
  }) => {
    if (!active || !logKind) return;
    try {
      await addLog(logKind, { ...payload, vehicleId: active.id, author: profile.fio });
      toast({ title: 'Запись добавлена' });
    } catch {
      toast({ title: 'Не удалось сохранить запись', variant: 'destructive' });
    }
  };

  const dropVehicle = async () => {
    if (!active) return;
    const plate = active.plate;
    setOpenVehicle(null);
    await remove(active.id);
    toast({ title: `Техника ${plate} удалена` });
  };

  if (pane) {
    const meta = {
      repairs: { t: 'ТО и ремонты', i: 'Wrench' },
      dossier: { t: 'Досье техники', i: 'FolderOpen' },
      drivers: { t: 'Кабинеты водителей', i: 'Users' },
    }[pane];
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <CabinetBar
          crumbs={[
            { label: 'Механик', icon: 'Wrench', onClick: () => setPane(null) },
            { label: meta.t, icon: meta.i },
          ]}
          backLabel="К обзору"
          onBack={() => setPane(null)}
          onExit={onExit}
        />
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {pane === 'repairs' && <RepairsCabinet vehicles={items} />}
          {pane === 'dossier' && <VehicleDossier vehicles={items} />}
          {pane === 'drivers' && <DriverActivity vehicles={items} />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <CabinetBar
        crumbs={[
          { label: 'Кабинет механика', icon: 'Wrench', onClick: () => setOpenVehicle(null) },
          ...(active ? [{ label: active.plate }] : []),
        ]}
        backLabel="К автопарку"
        onBack={active ? () => setOpenVehicle(null) : undefined}
        onExit={onExit}
        actions={
          <>
            {current && (
              <button
                type="button"
                onClick={() => setPassOpen(true)}
                className={cn(
                  'flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors',
                  current.mustChangePassword
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-card hover:border-accent hover:bg-secondary',
                )}
              >
                <Icon name="KeyRound" size={14} />
                Пароль
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                downloadWaybills(
                  logs.filter((l) => l.kind === 'waybill'),
                  items,
                  'Автопарк · весь период',
                  new Date().toLocaleDateString('ru'),
                )
              }
              className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
            >
              <Icon name="Download" size={14} className="text-accent" />
              Путевые листы
            </button>
            <button
              type="button"
              onClick={() => setDriverOpen(true)}
              className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
            >
              <Icon name="UserPlus" size={14} className="text-accent" />
              Водитель
            </button>
            <button
              type="button"
              onClick={() => openForm(null)}
              className="flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
            >
              <Icon name="Plus" size={14} />
              Добавить технику
            </button>
          </>
        }
      />

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {!active ? (
          <>
            <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-6 sm:py-5">
              <h1 className="font-head text-[19px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[28px]">
                Кабинет <span className="text-accent">механика</span>
              </h1>
              <p className="mt-2 text-[0.88em] text-muted-foreground">
                {profile.fio || 'ФИО не указано'} · {profile.org}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-px border-t border-border bg-border pt-px sm:grid-cols-4">
                {[
                  { icon: 'Truck', label: 'Единиц техники', value: items.length },
                  { icon: 'Navigation', label: 'На линии', value: onLine },
                  { icon: 'Wrench', label: 'На ТО/ремонте', value: inService },
                  { icon: 'FileText', label: 'Путевых листов', value: waybills },
                ].map((s) => (
                  <div key={s.label} className="bg-card px-3 py-3">
                    <Icon name={s.icon} fallback="File" size={16} className="text-accent" />
                    <p className="mt-1.5 font-head text-[1.4em] leading-none">{s.value}</p>
                    <p className="mt-1 text-[0.72em] uppercase tracking-[0.1em] text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <Panel title="Карта локаций · где стоит техника" className="flex-none">
              <FleetMap items={items} activeLoc={pickedLoc} onPick={setPickedLoc} />
            </Panel>

            <Panel
              title={pickedLoc === null ? 'Техника и водители' : 'Техника выбранной локации'}
              note={`${shown.length}`}
              className="flex-none"
            >
              <FleetTiles items={shown} shifts={shifts} onOpen={setOpenVehicle} />
            </Panel>

            <Panel
              title="Подходящие ТО · текущий и следующий месяц"
              note={soonService.length ? `${soonService.length}` : undefined}
              className="flex-none"
            >
              {!soonService.length ? (
                <Empty icon="ShieldCheck" title="Всё в порядке" hint="Ближайших ТО нет." />
              ) : (
                soonService.map((v) => {
                  const d = daysLeft(v.serviceAt);
                  return (
                    <Row
                      key={v.id}
                      title={`${v.plate || 'б/н'} · ${v.model}`}
                      sub={`ТО ${v.serviceAt} · ${v.driver || 'водитель не закреплён'}`}
                      unread={(d ?? 1) < 0}
                      right={
                        <Tag tone={(d ?? 1) < 0 ? 'hot' : 'wait'}>
                          {d === null ? '—' : d < 0 ? `просрочено ${-d} дн.` : `через ${d} дн.`}
                        </Tag>
                      }
                      onClick={() => setOpenVehicle(v.id)}
                    />
                  );
                })
              )}
            </Panel>

            {alerts.length > 0 && (
              <Panel title="Требуют внимания" note={`${alerts.length}`} className="flex-none">
                {alerts.map((a) => (
                  <Row
                    key={a.vehicle.id}
                    title={`${a.vehicle.plate} · ${a.vehicle.model}`}
                    sub={a.reasons.join(' · ')}
                    unread={a.overdue}
                    right={
                      <Tag tone={a.overdue ? 'hot' : 'wait'}>
                        {a.overdue ? 'Просрочено' : 'Скоро'}
                      </Tag>
                    }
                    onClick={() => setOpenVehicle(a.vehicle.id)}
                  />
                ))}
              </Panel>
            )}

            {(
              [
                {
                  k: 'repairs' as const,
                  i: 'Wrench',
                  t: 'ТО и ремонты',
                  s: 'Статистика затрат по месяцам и по технике',
                },
                {
                  k: 'dossier' as const,
                  i: 'FolderOpen',
                  t: 'Досье техники',
                  s: 'Ремонты, авансовые отчёты, акты и ведомости по каждой машине',
                },
                {
                  k: 'drivers' as const,
                  i: 'Users',
                  t: 'Кабинеты водителей',
                  s: 'Кто на какой технике и что внёс в систему',
                },
              ]
            ).map((b) => (
              <button
                key={b.k}
                type="button"
                onClick={() => setPane(b.k)}
                className="group flex flex-none items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                  <Icon name={b.i} size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                    {b.t}
                  </span>
                  <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                    {b.s}
                  </span>
                </span>
                <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
              </button>
            ))}
          </>
        ) : (
          <VehicleCard
            vehicle={active}
            logs={activeLogs}
            onStatus={setStatus}
            onLog={setLogKind}
            onEdit={() => openForm(active)}
            onRemove={dropVehicle}
            onRemoveLog={(id) => {
              removeLog(id);
              toast({ title: 'Запись удалена' });
            }}
          />
        )}
      </div>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent className="max-w-lg rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Смена пароля
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">{current?.fio}</DialogDescription>
          </DialogHeader>
          {current && <ChangePassword user={current} onDone={() => setPassOpen(false)} />}
        </DialogContent>
      </Dialog>

      <DriverForm
        open={driverOpen}
        onOpenChange={setDriverOpen}
        vehicles={items}
        onDone={reloadFleet}
      />

      <VehicleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={submitForm}
      />

      <LogDialog
        kind={logKind}
        onOpenChange={(v) => !v && setLogKind(null)}
        odometer={active?.odometer}
        onSubmit={saveLog}
      />
    </div>
  );
};

export default MechanicCabinet;
