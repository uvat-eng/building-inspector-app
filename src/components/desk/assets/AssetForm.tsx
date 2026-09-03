import { useEffect, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useObjects } from '@/data/store';
import {
  AssetType,
  ASSET_LABEL,
  CABIN_KINDS,
  DEVICE_KINDS,
  KIND_LABEL,
  STATUSES,
  Vehicle,
  VehicleDraft,
  VehicleKind,
  VehicleStatus,
} from '@/data/vehicles';

interface AssetFormProps {
  open: boolean;
  onClose: () => void;
  tab: AssetType;
  item: Vehicle | null;
  create: (draft: VehicleDraft) => Promise<Vehicle>;
  update: (id: string, patch: Record<string, string | number>) => Promise<Vehicle>;
  remove: (id: string) => Promise<void>;
}

const LABEL = 'text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground';
const SELECT = 'h-10 w-full rounded-sm border border-input bg-background px-3 text-[0.9em]';

const chip = (on: boolean) =>
  cn(
    'rounded-sm border px-2.5 py-1.5 text-[0.85em] transition-colors',
    on ? 'border-accent bg-accent text-accent-foreground' : 'border-input hover:bg-secondary',
  );

const AssetForm = ({ open, onClose, tab, item, create, update, remove }: AssetFormProps) => {
  const { toast } = useToast();
  const { list: objects } = useObjects();

  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [invNo, setInvNo] = useState('');
  const [kind, setKind] = useState('');
  const [driver, setDriver] = useState('');
  const [holder, setHolder] = useState('');
  const [objectId, setObjectId] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelNorm, setFuelNorm] = useState('');
  const [serviceAt, setServiceAt] = useState('');
  const [osagoTo, setOsagoTo] = useState('');
  const [verifiedTo, setVerifiedTo] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('На линии');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlate(item?.plate ?? '');
    setModel(item?.model ?? '');
    setInvNo(item?.invNo ?? '');
    setKind(item?.kind ?? (tab === 'vehicle' ? 'car' : tab === 'cabin' ? CABIN_KINDS[0] : DEVICE_KINDS[0]));
    setDriver(item?.driver ?? '');
    setHolder(item?.holder ?? '');
    setObjectId(item?.objectId ?? '');
    setOdometer(item?.odometer ? String(item.odometer) : '');
    setFuelNorm(item?.fuelNorm ? String(item.fuelNorm) : '');
    setServiceAt(item?.serviceAt ?? '');
    setOsagoTo(item?.osagoTo ?? '');
    setVerifiedTo(item?.verifiedTo ?? '');
    setStatus(item?.status ?? 'На линии');
    setNote(item?.note ?? '');
  }, [open, item, tab]);

  const invalid = () => {
    if (tab === 'vehicle' && (!plate.trim() || !model.trim())) {
      toast({ title: 'Укажите госномер и модель', variant: 'destructive' });
      return true;
    }
    if (tab === 'cabin' && !model.trim()) {
      toast({ title: 'Укажите наименование', variant: 'destructive' });
      return true;
    }
    if (tab === 'device' && (!model.trim() || !verifiedTo)) {
      toast({ title: 'Укажите наименование и срок поверки', variant: 'destructive' });
      return true;
    }
    return false;
  };

  const payload = (): Record<string, string | number> => {
    const base: Record<string, string | number> = {
      model: model.trim(),
      vehicleKind: kind,
      status,
      note: note.trim(),
    };
    if (tab === 'vehicle') {
      return {
        ...base,
        plate: plate.trim(),
        driver: driver.trim(),
        odometer: Number(odometer) || 0,
        fuelNorm: Number(fuelNorm) || 0,
        serviceAt,
        osagoTo,
      };
    }
    return {
      ...base,
      plate: '',
      invNo: invNo.trim(),
      holder: holder.trim(),
      objectId,
      verifiedTo: tab === 'device' ? verifiedTo : '',
    };
  };

  const save = async () => {
    if (invalid()) return;
    setBusy(true);
    try {
      const data = payload();
      if (item) {
        await update(item.id, data);
        toast({ title: 'Изменения сохранены' });
      } else {
        await create({ ...data, assetType: tab, plate: String(data.plate ?? ''), model: model.trim() });
        toast({ title: 'Позиция добавлена' });
      }
      onClose();
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const drop = async () => {
    if (!item) return;
    try {
      await remove(item.id);
      toast({ title: 'Позиция удалена' });
      onClose();
    } catch {
      toast({ title: 'Не удалось удалить', variant: 'destructive' });
    }
  };

  const objectSelect = (
    <div className="space-y-1.5">
      <Label className={LABEL}>Объект</Label>
      <select value={objectId} onChange={(e) => setObjectId(e.target.value)} className={SELECT}>
        <option value="">Не привязан</option>
        {objects.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            {item ? 'Карточка позиции' : 'Новая позиция'}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">{ASSET_LABEL[tab]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {tab === 'vehicle' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={LABEL}>Госномер</Label>
                <Input
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  className="rounded-sm"
                  placeholder="А123ВС 186"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Модель</Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded-sm"
                  placeholder="УАЗ Патриот"
                />
              </div>
            </div>
          )}

          {tab !== 'vehicle' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={LABEL}>
                  {tab === 'cabin' ? 'Наименование' : 'Наименование прибора'}
                </Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="rounded-sm"
                  placeholder={tab === 'cabin' ? 'Вагон-дом 9×3' : 'Нивелир Sokkia B40'}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>
                  {tab === 'cabin' ? 'Инвентарный номер' : 'Инвентарный / заводской номер'}
                </Label>
                <Input
                  value={invNo}
                  onChange={(e) => setInvNo(e.target.value)}
                  className="rounded-sm"
                  placeholder="ИНВ-000"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className={LABEL}>Тип</Label>
            <div className="flex flex-wrap gap-1.5">
              {tab === 'vehicle'
                ? (Object.keys(KIND_LABEL) as VehicleKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={chip(kind === k)}
                    >
                      {KIND_LABEL[k]}
                    </button>
                  ))
                : (tab === 'cabin' ? CABIN_KINDS : DEVICE_KINDS).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={chip(kind === k)}
                    >
                      {k}
                    </button>
                  ))}
            </div>
          </div>

          {tab === 'vehicle' && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={LABEL}>Водитель</Label>
                  <Input
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
                    className="rounded-sm"
                    placeholder="Иванов И. И."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL}>Пробег, км</Label>
                  <Input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className={LABEL}>Норма л/100км</Label>
                  <Input
                    type="number"
                    value={fuelNorm}
                    onChange={(e) => setFuelNorm(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL}>ТО</Label>
                  <Input
                    type="date"
                    value={serviceAt}
                    onChange={(e) => setServiceAt(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL}>ОСАГО до</Label>
                  <Input
                    type="date"
                    value={osagoTo}
                    onChange={(e) => setOsagoTo(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'device' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={LABEL}>Поверка до</Label>
                <Input
                  type="date"
                  value={verifiedTo}
                  onChange={(e) => setVerifiedTo(e.target.value)}
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Ответственный</Label>
                <Input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  className="rounded-sm"
                  placeholder="Петров П. П."
                />
              </div>
            </div>
          )}

          {tab === 'cabin' && (
            <div className="space-y-1.5">
              <Label className={LABEL}>Ответственный</Label>
              <Input
                value={holder}
                onChange={(e) => setHolder(e.target.value)}
                className="rounded-sm"
                placeholder="Петров П. П."
              />
            </div>
          )}

          {tab !== 'vehicle' && objectSelect}

          <div className="space-y-1.5">
            <Label className={LABEL}>Статус</Label>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={chip(status === s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={LABEL}>Примечание</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-sm"
              placeholder="Необязательно"
            />
          </div>

          <Button
            onClick={save}
            disabled={busy}
            className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name={busy ? 'Loader2' : 'Check'} size={16} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </Button>

          {item && (
            <Button
              variant="ghost"
              onClick={drop}
              className="w-full gap-2 rounded-sm text-[0.9em] text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Icon name="Trash2" size={14} />
              Удалить
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssetForm;
