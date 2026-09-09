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

interface AdviceFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle: Vehicle | null;
}

const AdviceForm = ({ open, onOpenChange, vehicle }: AdviceFormProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { reload } = useFleet();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setPhotos((p) => [...p, ...list].slice(0, 8));
  };

  const save = async () => {
    if (!vehicle) {
      toast({ title: 'Машина не закреплена', variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: 'Коротко опишите, что заметили', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createFleet('repair', {
        vehicleId: vehicle.id,
        repairKind: 'repair',
        title: `Рекомендация: ${title.trim()}`,
        repairDate: new Date().toISOString().slice(0, 10),
        odometer: vehicle.odometer,
        amount: 0,
        note: text.trim(),
        status: 'advice',
        photos: photos.length ? await readPhotos(photos) : [],
        author: profile.fio,
        authorRole: 'driver',
      });
      toast({ title: 'Рекомендация отправлена механику' });
      setTitle('');
      setText('');
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
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
            Рекомендация механику
          </DialogTitle>
          <DialogDescription>
            {vehicle
              ? `${vehicle.plate || 'б/н'} · ${vehicle.model}`
              : 'Машина не закреплена'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Что заметили
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Стук в передней подвеске на кочках"
              className="rounded-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Подробности
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Появился неделю назад, усиливается на скорости выше 40 км/ч"
              className="rounded-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Фото
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
                      alt="фото"
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
            {busy ? 'Отправляем…' : 'Отправить механику'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdviceForm;
