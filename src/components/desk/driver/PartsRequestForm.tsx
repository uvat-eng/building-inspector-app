import { useRef, useState } from 'react';
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
import { useProfile } from '@/data/profile';
import { Vehicle } from '@/data/vehicles';
import { readPhotos } from '@/data/fleet';
import {
  PartItem,
  PartRequest,
  URGENCY_LABEL,
  createPartRequest,
  useWaybills,
} from '@/data/waybills';

interface PartsRequestFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: Vehicle | null;
  vehicles: Vehicle[];
}

const emptyItem: PartItem = { title: '', article: '', qty: '1', unit: 'шт', note: '' };

const PartsRequestForm = ({
  open,
  onOpenChange,
  vehicle,
  vehicles,
}: PartsRequestFormProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { reload } = useWaybills();

  const [vehicleId, setVehicleId] = useState(vehicle?.id ?? '');
  const [reqNo, setReqNo] = useState('');
  const [reqDate, setReqDate] = useState(new Date().toISOString().slice(0, 10));
  const [urgency, setUrgency] = useState<PartRequest['urgency']>('normal');
  const [items, setItems] = useState<PartItem[]>([{ ...emptyItem }]);
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setPhotos((p) => [...p, ...list].slice(0, 12));
  };

  const setItem = (i: number, p: Partial<PartItem>) =>
    setItems((prev) => prev.map((x, k) => (k === i ? { ...x, ...p } : x)));

  const save = async () => {
    const target = vehicleId || vehicle?.id || '';
    if (!target) {
      toast({ title: 'Выберите технику', variant: 'destructive' });
      return;
    }
    const clean = items.filter((x) => x.title.trim());
    if (!clean.length) {
      toast({ title: 'Добавьте хотя бы одну позицию', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createPartRequest({
        vehicleId: target,
        driverFio: profile.fio,
        reqNo: reqNo.trim(),
        reqDate,
        urgency,
        items: clean,
        reason: reason.trim(),
        photos: photos.length ? await readPhotos(photos) : [],
        author: profile.fio,
        status: 'new',
      });
      toast({
        title: 'Заявка отправлена',
        description: 'Её увидят механик и руководитель проекта.',
      });
      setReqNo('');
      setItems([{ ...emptyItem }]);
      setReason('');
      setPhotos([]);
      onOpenChange(false);
      reload();
    } catch {
      toast({ title: 'Не удалось отправить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            Заявка на запчасти и комплектующие
          </DialogTitle>
          <DialogDescription>
            Уйдёт механику и руководителю проекта в раздел транспорта.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          {!vehicle && (
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Техника
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleId(v.id)}
                    className={cn(
                      'max-w-[15rem] truncate rounded-sm border px-2 py-1 text-[0.8em] transition-colors',
                      vehicleId === v.id
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-input hover:bg-secondary',
                    )}
                  >
                    {v.plate || 'б/н'} · {v.model}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Номер заявки
              </Label>
              <Input
                value={reqNo}
                onChange={(e) => setReqNo(e.target.value)}
                placeholder="ЗЧ-08"
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Дата
              </Label>
              <Input
                type="date"
                value={reqDate}
                onChange={(e) => setReqDate(e.target.value)}
                className="rounded-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Срочность
            </Label>
            <div className="flex gap-1.5">
              {(['normal', 'urgent', 'stop'] as PartRequest['urgency'][]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  className={cn(
                    'flex-1 rounded-sm border px-2 py-2 text-[0.8em] transition-colors',
                    urgency === u
                      ? u === 'stop'
                        ? 'border-destructive bg-destructive text-destructive-foreground'
                        : 'border-accent bg-accent text-accent-foreground'
                      : 'border-input hover:bg-secondary',
                  )}
                >
                  {URGENCY_LABEL[u]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Что нужно
            </Label>
            {items.map((it, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-sm border border-border p-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 flex-none text-[0.78em] text-muted-foreground">
                    {i + 1}
                  </span>
                  <Input
                    value={it.title}
                    onChange={(e) => setItem(i, { title: e.target.value })}
                    placeholder="Наименование запчасти"
                    className="flex-1 rounded-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setItems((p) => p.filter((_, k) => k !== i))}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    <Icon name="X" size={13} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pl-6 sm:grid-cols-4">
                  <Input
                    value={it.article}
                    onChange={(e) => setItem(i, { article: e.target.value })}
                    placeholder="артикул"
                    className="rounded-sm sm:col-span-2"
                  />
                  <Input
                    value={it.qty}
                    onChange={(e) => setItem(i, { qty: e.target.value })}
                    inputMode="decimal"
                    placeholder="кол-во"
                    className="rounded-sm"
                  />
                  <Input
                    value={it.unit}
                    onChange={(e) => setItem(i, { unit: e.target.value })}
                    placeholder="ед."
                    className="rounded-sm"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems((p) => [...p, { ...emptyItem }])}
              className="flex items-center gap-1.5 rounded-sm border border-dashed border-border px-2.5 py-1.5 text-[0.8em] hover:border-accent hover:text-accent"
            >
              <Icon name="Plus" size={13} />
              Добавить позицию
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Для чего нужно
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Течь сальника, требуется замена до выезда на трассу"
              className="rounded-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Фото узла или детали
            </Label>
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => camRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-[0.84em] transition-colors hover:border-accent hover:text-accent"
              >
                <Icon name="Camera" size={17} className="text-accent" />
                Сфотографировать
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-[0.84em] transition-colors hover:border-accent hover:text-accent"
              >
                <Icon name="ImageUp" size={17} className="text-accent" />
                Вложить готовое
              </button>
            </div>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {photos.map((f, i) => (
                  <span key={i} className="relative">
                    <img
                      src={URL.createObjectURL(f)}
                      alt="фото детали"
                      className="h-16 w-16 rounded-sm border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, k) => k !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground hover:border-destructive hover:text-destructive"
                    >
                      <Icon name="X" size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={save}
            disabled={busy}
            className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy ? 'Loader2' : 'Send'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            {busy ? 'Отправляем…' : 'Отправить заявку'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PartsRequestForm;
