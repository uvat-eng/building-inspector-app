import { useEffect, useState } from 'react';
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
import { cn } from '@/lib/utils';
import {
  REQUEST_INFO,
  RequestKind,
  RequestLine,
  WorkRequest,
  lineSum,
  requestTotal,
} from '@/data/requests';

interface RequestDialogProps {
  open: boolean;
  kind: RequestKind;
  request: WorkRequest | null;
  objects: { id: string; title: string }[];
  busy?: boolean;
  onClose: () => void;
  onSave: (data: Partial<WorkRequest>) => void;
}

const newLine = (unit: string): RequestLine => ({
  id: Math.random().toString(36).slice(2, 9),
  name: '',
  qty: '1',
  unit,
  price: '',
  note: '',
});

const money = (v: number) => v.toLocaleString('ru', { maximumFractionDigits: 2 });

const RequestDialog = ({
  open,
  kind,
  request,
  objects,
  busy,
  onClose,
  onSave,
}: RequestDialogProps) => {
  const info = REQUEST_INFO[kind];
  const [f, setF] = useState<Partial<WorkRequest>>({});
  const [lines, setLines] = useState<RequestLine[]>([]);

  useEffect(() => {
    if (!open) return;
    if (request) {
      setF({ ...request });
      setLines(request.items?.length ? request.items : [newLine(info.unit)]);
    } else {
      setF({
        title: '',
        objectTitle: objects[0]?.title ?? '',
        objectId: objects[0]?.id ?? '',
        needDate: new Date().toISOString().slice(0, 10),
        note: '',
        meta: {},
      });
      setLines([newLine(info.unit)]);
    }
  }, [open, request, objects, info.unit]);

  const set = (patch: Partial<WorkRequest>) => setF((p) => ({ ...p, ...patch }));

  const setLine = (id: string, patch: Partial<RequestLine>) =>
    setLines((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const total = requestTotal(lines);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
            {request ? `Заявка ${request.number}` : `Новая заявка · ${info.title}`}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">{info.note}</DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin flex max-h-[62vh] flex-col gap-3 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Наименование заявки
              </Label>
              <Input
                value={f.title ?? ''}
                onChange={(e) => set({ title: e.target.value })}
                placeholder={
                  kind === 'ticket'
                    ? 'Билеты Тюмень — Новый Уренгой, вахта октябрь'
                    : kind === 'expense'
                      ? 'Авансовый отчёт за сентябрь'
                      : 'Расходные материалы на куст 19'
                }
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Объект
              </Label>
              <Input
                list="req-objects"
                value={f.objectTitle ?? ''}
                onChange={(e) => {
                  const found = objects.find((o) => o.title === e.target.value);
                  set({ objectTitle: e.target.value, objectId: found?.id ?? '' });
                }}
                className="h-9 rounded-sm text-[0.88em]"
              />
              <datalist id="req-objects">
                {objects.map((o) => (
                  <option key={o.id} value={o.title} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                {kind === 'ticket' ? 'Дата выезда' : 'Нужно к дате'}
              </Label>
              <Input
                type="date"
                value={(f.needDate ?? '').slice(0, 10)}
                onChange={(e) => set({ needDate: e.target.value })}
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>

            {kind === 'ticket' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                    Маршрут
                  </Label>
                  <Input
                    value={f.meta?.route ?? ''}
                    onChange={(e) => set({ meta: { ...(f.meta ?? {}), route: e.target.value } })}
                    placeholder="Тюмень — Новый Уренгой"
                    className="h-9 rounded-sm text-[0.88em]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                    Дата возврата
                  </Label>
                  <Input
                    type="date"
                    value={(f.meta?.back ?? '').slice(0, 10)}
                    onChange={(e) => set({ meta: { ...(f.meta ?? {}), back: e.target.value } })}
                    className="h-9 rounded-sm text-[0.88em]"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <p className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                {kind === 'ticket'
                  ? 'Пассажиры'
                  : kind === 'expense'
                    ? 'Расходы по чекам'
                    : 'Позиции заявки'}
              </p>
              <button
                type="button"
                onClick={() => setLines((p) => [...p, newLine(info.unit)])}
                className="ml-auto text-[0.76em] text-accent hover:underline"
              >
                Добавить строку
              </button>
            </div>

            <div className="rounded-sm border border-border">
              {lines.map((l, i) => (
                <div
                  key={l.id}
                  className="grid gap-2 border-b border-border px-3 py-2.5 last:border-b-0 sm:grid-cols-[1fr_70px_70px_90px_28px]"
                >
                  <Input
                    value={l.name}
                    onChange={(e) => setLine(l.id, { name: e.target.value })}
                    placeholder={
                      kind === 'ticket'
                        ? 'Иванов И.И., паспорт'
                        : kind === 'expense'
                          ? 'Проживание, чек № 12'
                          : `Позиция ${i + 1}`
                    }
                    className="h-9 rounded-sm text-[0.85em]"
                  />
                  <Input
                    value={l.qty}
                    onChange={(e) => setLine(l.id, { qty: e.target.value })}
                    placeholder="кол-во"
                    className="h-9 rounded-sm text-center text-[0.85em]"
                  />
                  <Input
                    value={l.unit}
                    onChange={(e) => setLine(l.id, { unit: e.target.value })}
                    placeholder="ед."
                    className="h-9 rounded-sm text-center text-[0.85em]"
                  />
                  <Input
                    value={l.price}
                    onChange={(e) => setLine(l.id, { price: e.target.value })}
                    placeholder="цена"
                    className="h-9 rounded-sm text-right text-[0.85em]"
                  />
                  <button
                    type="button"
                    onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))}
                    className="flex h-9 items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-right text-[0.88em]">
              Итого: <span className="font-head">{money(total)} ₽</span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Обоснование
            </Label>
            <Textarea
              value={f.note ?? ''}
              onChange={(e) => set({ note: e.target.value })}
              rows={2}
              className="resize-none rounded-sm text-[0.88em]"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-sm" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              onSave({
                ...f,
                kind,
                items: lines.filter((l) => l.name.trim()),
                total: requestTotal(lines.filter((l) => l.name.trim())),
              })
            }
            className={cn(
              'flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em]',
              'text-accent-foreground hover:bg-accent/90',
            )}
          >
            <Icon
              name={busy ? 'Loader2' : 'Send'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            {request ? 'Сохранить' : 'Отправить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const lineTotal = lineSum;

export default RequestDialog;
