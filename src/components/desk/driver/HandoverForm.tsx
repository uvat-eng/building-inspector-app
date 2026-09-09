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
import { useProfile } from '@/data/profile';
import { Vehicle } from '@/data/vehicles';
import { createFleet, readPhotos, useFleet } from '@/data/fleet';

interface HandoverFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: Vehicle | null;
}

const HandoverForm = ({ open, onOpenChange, vehicle }: HandoverFormProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { reload } = useFleet();

  const [actNo, setActNo] = useState('');
  const [actDate, setActDate] = useState('');
  const [acceptDate, setAcceptDate] = useState('');
  const [acceptFio, setAcceptFio] = useState('');
  const [odometer, setOdometer] = useState('');
  const [exterior, setExterior] = useState('');
  const [defects, setDefects] = useState('');
  const [breakdowns, setBreakdowns] = useState('');
  const [advice, setAdvice] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setPhotos((p) => [...p, ...list].slice(0, 12));
  };

  const save = async () => {
    if (!vehicle) {
      toast({ title: 'Машина не закреплена', variant: 'destructive' });
      return;
    }
    if (!acceptFio.trim() || !actDate) {
      toast({ title: 'Укажите кому передаёте и дату передачи', variant: 'destructive' });
      return;
    }
    if (!photos.length) {
      toast({ title: 'Приложите хотя бы одно фото автомобиля', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createFleet('act', {
        vehicleId: vehicle.id,
        actKind: 'handover',
        actNo: actNo.trim(),
        actDate,
        acceptDate,
        driverFio: profile.fio,
        acceptFio: acceptFio.trim(),
        odometer,
        exterior: exterior.trim(),
        defects: defects.trim(),
        breakdowns: breakdowns.trim(),
        advice: advice.trim(),
        condition: exterior.trim(),
        items: [],
        photos: await readPhotos(photos),
        author: profile.fio,
      });
      toast({ title: 'Акт передачи создан', description: 'Механик получил документ.' });
      setActNo('');
      setActDate('');
      setAcceptDate('');
      setAcceptFio('');
      setOdometer('');
      setExterior('');
      setDefects('');
      setBreakdowns('');
      setAdvice('');
      setPhotos([]);
      onOpenChange(false);
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            Передача вахты
          </DialogTitle>
          <DialogDescription>
            {vehicle
              ? `${vehicle.plate || 'б/н'} · ${vehicle.model}`
              : 'Машина не закреплена'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Номер акта
              </Label>
              <Input
                value={actNo}
                onChange={(e) => setActNo(e.target.value)}
                placeholder="АП-14"
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Кому передаю
              </Label>
              <Input
                value={acceptFio}
                onChange={(e) => setAcceptFio(e.target.value)}
                placeholder="Сидоров Иван Петрович"
                className="rounded-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Дата передачи
              </Label>
              <Input
                type="date"
                value={actDate}
                onChange={(e) => setActDate(e.target.value)}
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Дата приёмки
              </Label>
              <Input
                type="date"
                value={acceptDate}
                onChange={(e) => setAcceptDate(e.target.value)}
                className="rounded-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Пробег, км
              </Label>
              <Input
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                inputMode="numeric"
                className="rounded-sm"
              />
            </div>
          </div>

          {[
            {
              l: 'Наружный осмотр',
              v: exterior,
              set: setExterior,
              p: 'Кузов без повреждений, стёкла целые, резина по сезону',
            },
            { l: 'Дефекты авто', v: defects, set: setDefects, p: 'Скол на лобовом стекле справа' },
            {
              l: 'Поломки, если есть',
              v: breakdowns,
              set: setBreakdowns,
              p: 'Не работает подогрев зеркал',
            },
            {
              l: 'Рекомендации по эксплуатации',
              v: advice,
              set: setAdvice,
              p: 'Прогревать до 5 минут, следить за уровнем масла',
            },
          ].map((f) => (
            <div key={f.l} className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                {f.l}
              </Label>
              <Textarea
                value={f.v}
                onChange={(e) => f.set(e.target.value)}
                rows={2}
                placeholder={f.p}
                className="rounded-sm"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Фото автомобиля · обязательно
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
                      alt="фото авто"
                      className="h-16 w-16 rounded-sm border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, k) => k !== i))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
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
              name={busy ? 'Loader2' : 'Check'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            {busy ? 'Формируем акт…' : 'Сформировать акт'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HandoverForm;
