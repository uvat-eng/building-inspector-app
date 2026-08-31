import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { REGION_POINTS } from '@/data/geo';
import { ProjectObject, STATUS_LABEL } from '@/data/store';

interface ObjectFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (o: Omit<ProjectObject, 'id'>) => void;
}

const EMPTY = {
  title: '',
  customer: '',
  customerLogo: '',
  contractNo: '',
  contractSum: '',
  regionId: 'yakutsk',
  stage: '',
  progress: '0',
  start: '',
  deadline: '',
  status: 'work' as ProjectObject['status'],
  staffPlan: '0',
  staffFact: '0',
  techPlan: '0',
  techFact: '0',
  orders: '0',
  ordersOpen: '0',
};

const ObjectForm = ({ open, onOpenChange, onSave }: ObjectFormProps) => {
  const [f, setF] = useState(EMPTY);
  const { toast } = useToast();
  const set = (k: keyof typeof EMPTY, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.title.trim() || !f.customer.trim()) {
      toast({ title: 'Заполните название объекта и заказчика', variant: 'destructive' });
      return;
    }
    const point = REGION_POINTS.find((r) => r.id === f.regionId)!;
    const n = (v: string) => Number(v.replace(/\s/g, '')) || 0;

    onSave({
      title: f.title.trim(),
      customer: f.customer.trim(),
      customerLogo: f.customerLogo.trim() || undefined,
      contractNo: f.contractNo.trim(),
      contractSum: n(f.contractSum),
      regionId: point.id,
      regionName: point.name,
      district: point.district,
      lon: point.lon,
      lat: point.lat,
      stage: f.stage.trim() || 'Подготовительный этап',
      progress: Math.min(100, n(f.progress)),
      start: f.start,
      deadline: f.deadline,
      status: f.status,
      staffPlan: n(f.staffPlan),
      staffFact: n(f.staffFact),
      techPlan: n(f.techPlan),
      techFact: n(f.techFact),
      orders: n(f.orders),
      ordersOpen: n(f.ordersOpen),
    });
    toast({ title: 'Объект добавлен', description: 'Метка появилась на карте, сводка пересчитана.' });
    setF(EMPTY);
    onOpenChange(false);
  };

  const field = (k: keyof typeof EMPTY, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        value={f[k] as string}
        onChange={(e) => set(k, e.target.value)}
        className="rounded-sm"
        {...props}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-xl uppercase tracking-[0.04em]">
            Новый объект
          </DialogTitle>
          <DialogDescription>
            Данные попадут на карту и в сводку по портфелю
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">{field('title', 'Название объекта')}</div>
          {field('customer', 'Заказчик')}
          {field('customerLogo', 'Ссылка на эмблему заказчика', { placeholder: 'https://…' })}
          {field('contractNo', 'Номер договора')}
          {field('contractSum', 'Сумма договора, ₽', { inputMode: 'numeric' })}

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Точка на карте
            </Label>
            <Select value={f.regionId} onValueChange={(v) => set('regionId', v)}>
              <SelectTrigger className="rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {REGION_POINTS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Статус
            </Label>
            <Select value={f.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger className="rounded-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {field('stage', 'Текущий этап работ')}
          {field('progress', 'Готовность, %', { inputMode: 'numeric' })}
          {field('start', 'Начало работ', { type: 'date' })}
          {field('deadline', 'Срок по договору', { type: 'date' })}
          {field('staffPlan', 'Персонал, план', { inputMode: 'numeric' })}
          {field('staffFact', 'Персонал, факт', { inputMode: 'numeric' })}
          {field('techPlan', 'Техника, план', { inputMode: 'numeric' })}
          {field('techFact', 'Техника, факт', { inputMode: 'numeric' })}
          {field('orders', 'Предписаний выдано', { inputMode: 'numeric' })}
          {field('ordersOpen', 'Из них не устранено', { inputMode: 'numeric' })}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" className="rounded-sm" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            className="rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            onClick={submit}
          >
            Сохранить объект
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ObjectForm;
