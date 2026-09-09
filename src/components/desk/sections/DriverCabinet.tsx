import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
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
import { useProfile } from '@/data/profile';
import { useUsers, User } from '@/data/users';
import { useInspectorsRollup } from '@/data/rollup';
import CabinetBar from '@/components/desk/CabinetBar';
import ChangePassword from '@/components/desk/ChangePassword';
import WaybillForm, { WaybillPayload } from '@/components/desk/driver/WaybillForm';
import DriverActions, { DriverAction } from '@/components/desk/driver/DriverActions';
import DriverContacts from '@/components/desk/driver/DriverContacts';
import CarDialog from '@/components/desk/driver/CarDialog';
import CarSheet from '@/components/desk/driver/CarSheet';
import HandoverForm from '@/components/desk/driver/HandoverForm';
import RequestsCabinet from '@/components/desk/chief/RequestsCabinet';
import PartsRequestForm from '@/components/desk/driver/PartsRequestForm';
import AdviceForm from '@/components/desk/driver/AdviceForm';
import WaybillsCabinet from '@/components/desk/waybill/WaybillsCabinet';
import { KIND_LABEL, useVehicles } from '@/data/vehicles';
import { activeShift, ruDate, useFleet } from '@/data/fleet';

interface DriverCabinetProps {
  onExit?: () => void;
}

const DriverCabinet = ({ onExit }: DriverCabinetProps) => {
  const { items: vehicles, addLog } = useVehicles('vehicle');
  const { users, current } = useUsers();
  const { profile } = useProfile();
  const { shifts } = useFleet();
  const { items: rollup } = useInspectorsRollup();

  const [passOpen, setPassOpen] = useState(false);
  const [waybill, setWaybill] = useState(false);
  const [action, setAction] = useState<DriverAction>(null);
  const [reqOpen, setReqOpen] = useState(false);
  const [carOpen, setCarOpen] = useState(false);
  const [handover, setHandover] = useState(false);
  const [partsOpen, setPartsOpen] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [wbOpen, setWbOpen] = useState(false);

  const myShift = useMemo(
    () => shifts.find((s) => s.driverFio === profile.fio) ?? null,
    [shifts, profile.fio],
  );

  const myCar = useMemo(() => {
    if (myShift) return vehicles.find((v) => v.id === myShift.vehicleId) ?? null;
    const first = profile.fio.split(' ')[0].toLowerCase();
    return (
      vehicles.find((v) => first && v.driver?.toLowerCase().includes(first)) ?? null
    );
  }, [vehicles, myShift, profile.fio]);

  const onShiftNow = useMemo(() => {
    const live = rollup.filter((r) => r.onShift).map((r) => r.id);
    return users.filter((u: User) => u.role === 'inspector' && live.includes(u.id));
  }, [rollup, users]);

  const running = myCar ? activeShift(shifts, myCar.id) : null;

  if (reqOpen) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <CabinetBar
          crumbs={[
            { label: 'Водитель', icon: 'Truck', onClick: () => setReqOpen(false) },
            { label: 'Заявки', icon: 'PackagePlus' },
          ]}
          backLabel="К обзору"
          onBack={() => setReqOpen(false)}
          onExit={onExit}
        />
        <RequestsCabinet kind="material" />
      </div>
    );
  }

  if (wbOpen) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <CabinetBar
          crumbs={[
            { label: 'Водитель', icon: 'Truck', onClick: () => setWbOpen(false) },
            { label: 'Путевые листы', icon: 'FileText' },
          ]}
          backLabel="К обзору"
          onBack={() => setWbOpen(false)}
          onExit={onExit}
        />
        <WaybillsCabinet
          vehicles={myCar ? [myCar] : vehicles}
          defaultVehicle={myCar?.id}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <CabinetBar
        crumbs={[{ label: 'Кабинет · водитель', icon: 'Truck' }]}
        onExit={onExit}
        actions={
          current?.mustChangePassword ? (
            <button
              type="button"
              onClick={() => setPassOpen(true)}
              className="flex items-center gap-1.5 rounded-sm border border-accent bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground"
            >
              <Icon name="KeyRound" size={14} />
              Пароль
            </button>
          ) : undefined
        }
      />

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[0.7em] uppercase tracking-[0.12em] text-muted-foreground">
            Водитель
          </p>
          <h1 className="mt-1 font-head text-[20px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[28px]">
            {profile.fio || 'ФИО не указано'}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-1.5 text-[0.82em]">
              <Icon name="LogIn" size={14} className="text-accent" />
              Заезд: {ruDate(myShift?.startAt) || 'не указан'}
            </span>
            <span className="flex items-center gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-1.5 text-[0.82em]">
              <Icon name="LogOut" size={14} className="text-accent" />
              Выезд: {ruDate(myShift?.endAt) || 'не указан'}
            </span>
            {running && (
              <span className="flex items-center gap-2 rounded-sm border border-emerald-600 px-3 py-1.5 text-[0.82em] text-emerald-700">
                <Icon name="CircleCheck" size={14} />
                Вы на вахте
              </span>
            )}
          </div>
        </section>

        <Panel title="Моя машина" className="flex-none">
          {!myCar ? (
            <Empty
              icon="Truck"
              title="Машина не закреплена"
              hint="Обратитесь к механику — он закрепит технику за вами."
            />
          ) : (
            <div className="p-3">
              <button
                type="button"
                onClick={() => setCarOpen(true)}
                className="flex w-full items-center gap-3 rounded-sm border border-border border-l-[3px] border-l-accent bg-card px-4 py-4 text-left transition-colors hover:bg-secondary"
              >
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                  <Icon name="Truck" size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-head text-[1.05em] uppercase tracking-[0.03em]">
                    {myCar.model || 'Без модели'}
                  </span>
                  <span className="block truncate text-[0.84em] text-muted-foreground">
                    {myCar.plate || 'без номера'} · {KIND_LABEL[myCar.kind] ?? myCar.kind} ·{' '}
                    {myCar.odometer || 0} км
                  </span>
                </span>
                <span
                  className={cn(
                    'flex-none rounded-sm border px-2 py-1 text-[0.72em] uppercase tracking-[0.06em]',
                    myCar.status === 'На линии'
                      ? 'border-emerald-600 text-emerald-600'
                      : myCar.status === 'Ремонт'
                        ? 'border-destructive text-destructive'
                        : 'border-border text-muted-foreground',
                  )}
                >
                  {myCar.status}
                </span>
                <Icon name="ChevronRight" size={17} className="flex-none text-accent" />
              </button>
            </div>
          )}
        </Panel>

        <DriverContacts onShift={onShiftNow} />

        <CarSheet vehicle={myCar} />

        <div className="grid flex-none gap-2 sm:grid-cols-2">
          {(
            [
              {
                k: 'handover' as const,
                i: 'ArrowLeftRight',
                t: 'Передача вахты',
                s: 'Акт передачи автомобиля с фото',
              },
              {
                k: 'waybill' as const,
                i: 'FileText',
                t: 'Путевые листы',
                s: 'Создать по бланку и посмотреть свод',
              },
              {
                k: 'parts' as const,
                i: 'PackageSearch',
                t: 'Заявка на запчасти',
                s: 'Уйдёт механику и руководителю проекта',
              },
              {
                k: 'advice' as const,
                i: 'MessageSquareWarning',
                t: 'Рекомендации механику',
                s: 'Что заметили в работе машины',
              },
              {
                k: 'request' as const,
                i: 'PackagePlus',
                t: 'Заявки',
                s: 'Материалы и обеспечение',
              },
              {
                k: 'repair' as const,
                i: 'Wrench',
                t: 'Сделал ремонт',
                s: 'Работа и фото механику',
              },
              {
                k: 'expense' as const,
                i: 'ReceiptText',
                t: 'Авансовый отчёт',
                s: 'Подотчёт или покупка за свои',
              },
              {
                k: 'writeoff' as const,
                i: 'ClipboardList',
                t: 'Ведомость на списание',
                s: 'Переданные и использованные запчасти',
              },
            ]
          ).map((b) => (
            <button
              key={b.k}
              type="button"
              onClick={() => {
                if (b.k === 'request') setReqOpen(true);
                else if (b.k === 'waybill') setWbOpen(true);
                else if (b.k === 'parts') setPartsOpen(true);
                else if (b.k === 'advice') setAdviceOpen(true);
                else if (b.k === 'handover') setHandover(true);
                else setAction(b.k as DriverAction);
              }}
              className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-3.5 text-left transition-colors hover:bg-foreground hover:text-background"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name={b.i} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.04em]">
                  {b.t}
                </span>
                <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                  {b.s}
                </span>
              </span>
              <Icon name="ArrowRight" size={16} className="flex-none text-accent" />
            </button>
          ))}
        </div>
      </div>

      <CarDialog vehicle={carOpen ? myCar : null} onClose={() => setCarOpen(false)} />

      <HandoverForm open={handover} onOpenChange={setHandover} vehicle={myCar} />

      <PartsRequestForm
        open={partsOpen}
        onOpenChange={setPartsOpen}
        vehicle={myCar}
        vehicles={vehicles}
      />

      <AdviceForm open={adviceOpen} onOpenChange={setAdviceOpen} vehicle={myCar} />

      <DriverActions
        action={action}
        onClose={() => setAction(null)}
        vehicles={myCar ? [myCar] : vehicles}
        defaultVehicle={myCar?.id}
      />

      <WaybillForm
        open={waybill}
        onOpenChange={setWaybill}
        vehicles={myCar ? [myCar] : vehicles}
        author={profile.fio}
        project={current?.group || ''}
        onSubmit={async (p: WaybillPayload) => {
          await addLog('waybill', { ...p, author: profile.fio });
        }}
      />

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
    </div>
  );
};

export default DriverCabinet;