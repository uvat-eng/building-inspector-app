import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Empty from '@/components/desk/Empty';
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
import { useScope } from '@/data/scope';
import CabinetBar from '@/components/desk/CabinetBar';
import ChangePassword from '@/components/desk/ChangePassword';
import WaybillForm, { WaybillPayload } from '@/components/desk/driver/WaybillForm';
import { downloadWaybills } from '@/lib/waybillXls';
import { fmtDate, useVehicles } from '@/data/vehicles';

interface DriverCabinetProps {
  onExit?: () => void;
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

const DriverCabinet = ({ onExit }: DriverCabinetProps) => {
  const { items: vehicles, logs, addLog, removeLog, loading } = useVehicles('vehicle');
  const { current } = useUsers();
  const { profile } = useProfile();
  const { scope } = useScope();
  const { toast } = useToast();

  const [month, setMonth] = useState(currentMonth);
  const [passOpen, setPassOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const project = current?.group || scope.project || '';

  const myVehicles = useMemo(() => {
    const first = profile.fio.split(' ')[0].toLowerCase();
    const mine = vehicles.filter(
      (v) => v.driver && first && v.driver.toLowerCase().includes(first),
    );
    return mine.length ? mine : vehicles;
  }, [vehicles, profile.fio]);

  const waybills = useMemo(() => {
    const all = logs.filter((l) => l.kind === 'waybill');
    const sorted = all.slice().sort((a, b) => b.date.localeCompare(a.date));
    if (!profile.fio) return sorted;
    return [
      ...sorted.filter((l) => l.author === profile.fio),
      ...sorted.filter((l) => l.author !== profile.fio),
    ];
  }, [logs, profile.fio]);

  const monthly = useMemo(
    () => waybills.filter((l) => l.date.slice(0, 7) === month),
    [waybills, month],
  );

  const monthKm = monthly.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const save = async (p: WaybillPayload) => {
    try {
      await addLog('waybill', {
        vehicleId: p.vehicleId,
        date: p.date,
        odometer: Number(p.odometer),
        amount: Number(p.amount),
        content: `${p.content}${project ? ` · ${project}` : ''}`,
        author: profile.fio,
      });
      toast({ title: 'Путевой лист оформлен' });
    } catch {
      toast({ title: 'Не удалось сохранить путевой лист', variant: 'destructive' });
    }
  };

  const exportXls = () => {
    if (!monthly.length) {
      toast({ title: 'За выбранный месяц листов нет', variant: 'destructive' });
      return;
    }
    downloadWaybills(monthly, vehicles, project || profile.org, month);
  };

  const stats = [
    { icon: 'FileText', label: 'Путевых листов за месяц', value: monthly.length },
    { icon: 'Navigation', label: 'Пробег за месяц, км', value: monthKm },
    { icon: 'Truck', label: 'Закреплено машин', value: myVehicles.length },
    { icon: 'Archive', label: 'Всего листов', value: waybills.length },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <CabinetBar
        crumbs={[{ label: 'Кабинет водителя', icon: 'Truck' }]}
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
              onClick={exportXls}
              className="flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
            >
              <Icon name="Download" size={14} />
              Выгрузить в Excel
            </button>
          </>
        }
      />

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-6 sm:py-5">
          <h1 className="font-head text-[19px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[28px]">
            Кабинет <span className="text-accent">водителя</span>
          </h1>
          <p className="mt-2 text-[0.88em] text-muted-foreground">
            {profile.fio || 'ФИО не указано'} · {project || 'проект не назначен'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-px border-t border-border bg-border pt-px sm:grid-cols-4">
            {stats.map((s) => (
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

        <Panel
          title="Путевые листы"
          note={loading ? 'загрузка…' : `${monthly.length}`}
          action={
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
              className="rounded-sm border border-input bg-background px-2 py-1 font-body text-[0.86em] normal-case tracking-normal outline-none focus:border-accent"
            />
          }
        >
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex w-full items-center gap-3 border-b border-border/60 bg-accent/[0.06] px-4 py-3 text-left transition-colors hover:bg-accent/15"
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="Plus" size={18} />
            </span>
            <span className="font-head text-[0.9em] uppercase tracking-[0.1em]">
              Новый путевой лист
            </span>
          </button>

          {monthly.length === 0 ? (
            <Empty
              icon="FileText"
              title="Путевых листов нет"
              hint="Нажмите плюс — часть данных подставится автоматически."
            />
          ) : (
            monthly.map((l) => {
              const v = vehicles.find((x) => x.id === l.vehicleId);
              return (
                <Row
                  key={l.id}
                  title={`${fmtDate(l.date)} · ${v?.plate ?? '—'}`}
                  sub={`${l.amount} км · ${l.content || 'без маршрута'}`}
                  right={
                    <span
                      role="button"
                      tabIndex={0}
                      title="Удалить"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLog(l.id);
                        toast({ title: 'Путевой лист удалён' });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.stopPropagation();
                        removeLog(l.id);
                        toast({ title: 'Путевой лист удалён' });
                      }}
                      className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Icon name="Trash2" size={15} />
                    </span>
                  }
                />
              );
            })
          )}
        </Panel>
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

      <WaybillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicles={myVehicles}
        project={project}
        author={profile.fio}
        onSubmit={save}
      />
    </div>
  );
};

export default DriverCabinet;