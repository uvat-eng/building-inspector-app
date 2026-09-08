import { useMemo, useRef, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import CabinetBar from '@/components/desk/CabinetBar';
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
import { useObjects, NO_FIELD } from '@/data/store';
import { useLocations, locTitle } from '@/data/locations';
import {
  Contract,
  ContractAct,
  VAT_OPTIONS,
  createAct,
  createContract,
  money,
  patchAct,
  readFile,
  removeAct,
  removeContract,
  ruDate,
  useContracts,
} from '@/data/contracts';

interface ContractsCabinetProps {
  onBack?: () => void;
}

const emptyForm = {
  number: '',
  title: 'Оказание услуг строительного контроля',
  customer: '',
  locationId: '',
  fieldKey: '',
  signedAt: '',
  startAt: '',
  endAt: '',
  amount: '',
  vat: VAT_OPTIONS[0],
  note: '',
};

const ContractsCabinet = ({ onBack }: ContractsCabinetProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { list: locations } = useLocations();
  const { items, acts, loading, reload } = useContracts();

  const [form, setForm] = useState(false);
  const [f, setF] = useState(emptyForm);
  const [objs, setObjs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const [actFor, setActFor] = useState<Contract | null>(null);
  const [a, setA] = useState({ number: '', actDate: '', period: '', amount: '', note: '' });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const projects = useMemo(() => {
    const set = new Set(objects.map((o) => o.field?.trim() || NO_FIELD));
    return [...set].sort((x, y) => x.localeCompare(y, 'ru'));
  }, [objects]);

  const actsOf = (id: string) => acts.filter((x) => x.contractId === id);
  const doneOf = (id: string) => actsOf(id).reduce((s, x) => s + (x.amount || 0), 0);
  const paidOf = (id: string) =>
    actsOf(id).filter((x) => x.paid).reduce((s, x) => s + (x.amount || 0), 0);

  const totals = useMemo(() => {
    const sum = items.reduce((s, c) => s + (c.amount || 0), 0);
    const done = acts.reduce((s, x) => s + (x.amount || 0), 0);
    const paid = acts.filter((x) => x.paid).reduce((s, x) => s + (x.amount || 0), 0);
    return { sum, done, paid, left: sum - done, debt: done - paid };
  }, [items, acts]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const save = async () => {
    if (!f.number.trim() || !f.customer.trim()) {
      toast({ title: 'Укажите номер договора и заказчика', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await createContract({ ...f, amount: Number(f.amount.replace(/\s|,/g, '.')) || 0, objects: objs, author: profile.fio });
      toast({ title: 'Договор добавлен' });
      setForm(false);
      setF(emptyForm);
      setObjs([]);
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить договор', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveAct = async () => {
    if (!actFor) return;
    if (!a.number.trim() || !a.amount.trim()) {
      toast({ title: 'Укажите номер акта и сумму', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const payload: Parameters<typeof createAct>[0] = {
        contractId: actFor.id,
        number: a.number.trim(),
        actDate: a.actDate,
        period: a.period.trim(),
        amount: Number(a.amount.replace(/\s|,/g, '.')) || 0,
        note: a.note.trim(),
        author: profile.fio,
      };
      if (file) {
        payload.content = await readFile(file);
        payload.fileName = file.name;
        payload.mime = file.type;
      }
      await createAct(payload);
      toast({ title: 'Акт добавлен', description: 'Сумма учтена в договоре.' });
      setActFor(null);
      setA({ number: '', actDate: '', period: '', amount: '', note: '' });
      setFile(null);
      reload();
    } catch {
      toast({ title: 'Не удалось сохранить акт', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const togglePaid = async (x: ContractAct) => {
    await patchAct(x.id, {
      paid: !x.paid,
      paidAt: !x.paid ? new Date().toISOString().slice(0, 10) : '',
    });
    reload();
  };

  const dropAct = async (x: ContractAct) => {
    await removeAct(x.id);
    reload();
  };

  const dropContract = async (c: Contract) => {
    await removeContract(c.id);
    toast({ title: 'Договор удалён' });
    reload();
  };

  const counters = [
    { label: 'Сумма договоров', value: money(totals.sum), icon: 'FileSignature' },
    { label: 'Выполнено по актам', value: money(totals.done), icon: 'ClipboardCheck' },
    { label: 'Оплачено', value: money(totals.paid), icon: 'Wallet' },
    { label: 'Остаток по договорам', value: money(totals.left), icon: 'PiggyBank' },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {onBack && (
        <CabinetBar
          crumbs={[
            { label: 'Кабинет', icon: 'LayoutGrid', onClick: onBack },
            { label: 'Договоры с заказчиком', icon: 'FileSignature' },
          ]}
          backLabel="В кабинет"
          onBack={onBack}
        />
      )}

      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {counters.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={c.icon} fallback="Circle" size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-head text-[1.15em] leading-none">
                {c.value} ₽
              </span>
              <span className="mt-1 block truncate text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <Panel
        title="Договоры на строительный контроль"
        note={`${items.length} шт.`}
        className="min-h-0 flex-1"
        action={
          <Button
            size="sm"
            onClick={() => setForm(true)}
            className="ml-auto gap-1.5 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="Plus" size={14} />
            Договор
          </Button>
        }
      >
        {loading && !items.length ? (
          <Empty icon="Loader" title="Загружаем договоры" hint="Секунду." />
        ) : !items.length ? (
          <Empty
            icon="FileSignature"
            title="Договоров пока нет"
            hint="Нажмите «Договор» — укажите заказчика, сумму и срок, затем прикладывайте акты."
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-y-auto">
            <div className="flex flex-col divide-y divide-border">
              {items.map((c) => {
                const list = actsOf(c.id);
                const done = doneOf(c.id);
                const paid = paidOf(c.id);
                const left = (c.amount || 0) - done;
                const share = c.amount > 0 ? Math.min(100, Math.round((done / c.amount) * 100)) : 0;
                const on = open === c.id;
                return (
                  <div key={c.id} className="flex flex-col gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setOpen(on ? null : c.id)}
                      className="flex items-start gap-3 text-left"
                    >
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                        <Icon name="FileSignature" size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.03em]">
                          № {c.number} · {c.customer}
                        </span>
                        <span className="block truncate text-[0.8em] text-muted-foreground">
                          {c.title}
                          {c.fieldKey ? ` · ${c.fieldKey}` : ''}
                          {c.locationId ? ` · ${locTitle(locations, c.locationId)}` : ''}
                        </span>
                        <span className="mt-1 block text-[0.8em]">
                          <span className="font-head">{money(c.amount)} ₽</span>
                          <span className="text-muted-foreground"> · {c.vat}</span>
                          {c.startAt || c.endAt ? (
                            <span className="text-muted-foreground">
                              {' '}
                              · {ruDate(c.startAt)} — {ruDate(c.endAt)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="flex flex-none flex-col items-end gap-1">
                        <span className="text-[0.78em] font-head">{share}%</span>
                        <span className="h-1.5 w-24 overflow-hidden rounded-sm bg-secondary">
                          <span
                            className={cn(
                              'block h-full',
                              share >= 100 ? 'bg-emerald-600' : 'bg-accent',
                            )}
                            style={{ width: `${share}%` }}
                          />
                        </span>
                        <span className="text-[0.72em] text-muted-foreground">
                          актов {list.length}
                        </span>
                      </span>
                      <Icon
                        name={on ? 'ChevronUp' : 'ChevronDown'}
                        size={16}
                        className="mt-1 flex-none text-muted-foreground"
                      />
                    </button>

                    {on && (
                      <div className="flex flex-col gap-2 rounded-sm border border-border bg-secondary/30 p-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          {[
                            { l: 'Выполнено', v: done },
                            { l: 'Оплачено', v: paid },
                            { l: 'Остаток', v: left },
                          ].map((x) => (
                            <span
                              key={x.l}
                              className="rounded-sm border border-border bg-card px-3 py-2"
                            >
                              <span className="block font-head text-[1em]">{money(x.v)} ₽</span>
                              <span className="block text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                                {x.l}
                              </span>
                            </span>
                          ))}
                        </div>

                        {c.note && (
                          <p className="text-[0.82em] text-muted-foreground">{c.note}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => setActFor(c)}
                            className="gap-1.5 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
                          >
                            <Icon name="Upload" size={14} />
                            Загрузить акт
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => dropContract(c)}
                            className="gap-1.5 rounded-sm"
                          >
                            <Icon name="Trash2" size={14} />
                            Удалить договор
                          </Button>
                        </div>

                        {!list.length ? (
                          <p className="text-[0.82em] text-muted-foreground">
                            Актов выполненных работ пока нет.
                          </p>
                        ) : (
                          <div className="flex flex-col divide-y divide-border rounded-sm border border-border bg-card">
                            {list.map((x) => (
                              <div key={x.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[0.86em]">
                                    Акт № {x.number}
                                    {x.actDate ? ` от ${ruDate(x.actDate)}` : ''}
                                    {x.period ? ` · ${x.period}` : ''}
                                  </span>
                                  {x.note && (
                                    <span className="block truncate text-[0.76em] text-muted-foreground">
                                      {x.note}
                                    </span>
                                  )}
                                </span>
                                <span className="flex-none font-head text-[0.88em]">
                                  {money(x.amount)} ₽
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePaid(x)}
                                  className={cn(
                                    'flex-none rounded-sm border px-2 py-1 text-[0.74em] uppercase tracking-[0.06em] transition-colors',
                                    x.paid
                                      ? 'border-emerald-600 text-emerald-600'
                                      : 'border-border text-muted-foreground hover:border-accent hover:text-accent',
                                  )}
                                >
                                  {x.paid ? `оплачен ${ruDate(x.paidAt)}` : 'не оплачен'}
                                </button>
                                {x.fileUrl && (
                                  <a
                                    href={x.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={x.fileName}
                                    className="flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                                  >
                                    <Icon name="Paperclip" size={13} />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => dropAct(x)}
                                  className="flex h-7 w-7 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                                >
                                  <Icon name="X" size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Договор с заказчиком на СК
            </DialogTitle>
            <DialogDescription>
              Сумма договора вносится вручную. Дальше по нему прикладываются акты выполненных
              работ — остаток считается сам.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Номер договора
                </Label>
                <Input
                  value={f.number}
                  onChange={(e) => setF({ ...f, number: e.target.value })}
                  placeholder="СК-2026/14"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Заказчик
                </Label>
                <Input
                  value={f.customer}
                  onChange={(e) => setF({ ...f, customer: e.target.value })}
                  placeholder="ООО «Газпром добыча»"
                  className="rounded-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Предмет договора
              </Label>
              <Input
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                className="rounded-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Сумма договора, ₽
                </Label>
                <Input
                  value={f.amount}
                  onChange={(e) => setF({ ...f, amount: e.target.value })}
                  inputMode="decimal"
                  placeholder="12500000"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  НДС
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {VAT_OPTIONS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setF({ ...f, vat: v })}
                      className={cn(
                        'rounded-sm border px-2 py-1 text-[0.8em] transition-colors',
                        f.vat === v
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { k: 'signedAt' as const, l: 'Подписан' },
                { k: 'startAt' as const, l: 'Начало работ' },
                { k: 'endAt' as const, l: 'Окончание' },
              ].map((d) => (
                <div key={d.k} className="space-y-1.5">
                  <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                    {d.l}
                  </Label>
                  <Input
                    type="date"
                    value={f[d.k]}
                    onChange={(e) => setF({ ...f, [d.k]: e.target.value })}
                    className="rounded-sm"
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Локация
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {locations.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() =>
                        setF({ ...f, locationId: f.locationId === l.id ? '' : l.id })
                      }
                      className={cn(
                        'rounded-sm border px-2 py-1 text-[0.8em] transition-colors',
                        f.locationId === l.id
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      {l.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Проект
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {projects.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setF({ ...f, fieldKey: f.fieldKey === p ? '' : p })}
                      className={cn(
                        'max-w-[13rem] truncate rounded-sm border px-2 py-1 text-[0.8em] transition-colors',
                        f.fieldKey === p
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      {p === NO_FIELD ? 'Без проекта' : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Объекты по договору
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {objects
                  .filter((o) => !f.fieldKey || (o.field?.trim() || NO_FIELD) === f.fieldKey)
                  .map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setObjs((p) => toggle(p, o.id))}
                      className={cn(
                        'max-w-[15rem] truncate rounded-sm border px-2 py-1 text-[0.78em] transition-colors',
                        objs.includes(o.id)
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      {o.title}
                    </button>
                  ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Примечание
              </Label>
              <Textarea
                value={f.note}
                onChange={(e) => setF({ ...f, note: e.target.value })}
                rows={2}
                className="rounded-sm"
                placeholder="Условия оплаты, этапность, особые пункты"
              />
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
              {busy ? 'Сохраняем…' : 'Добавить договор'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actFor} onOpenChange={(v) => !v && setActFor(null)}>
        <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Акт выполненных работ
            </DialogTitle>
            <DialogDescription>
              Договор № {actFor?.number} · {actFor?.customer}. Сумма акта уменьшит остаток по
              договору.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Номер акта
                </Label>
                <Input
                  value={a.number}
                  onChange={(e) => setA({ ...a, number: e.target.value })}
                  placeholder="14/1"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Дата акта
                </Label>
                <Input
                  type="date"
                  value={a.actDate}
                  onChange={(e) => setA({ ...a, actDate: e.target.value })}
                  className="rounded-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Период
                </Label>
                <Input
                  value={a.period}
                  onChange={(e) => setA({ ...a, period: e.target.value })}
                  placeholder="Февраль 2026"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Сумма акта, ₽
                </Label>
                <Input
                  value={a.amount}
                  onChange={(e) => setA({ ...a, amount: e.target.value })}
                  inputMode="decimal"
                  placeholder="1250000"
                  className="rounded-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Скан акта
              </Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center gap-2 rounded-sm border border-dashed border-border px-3 py-3 text-left text-[0.84em] transition-colors hover:border-accent"
              >
                <Icon name={file ? 'FileCheck' : 'Upload'} size={17} className="flex-none text-accent" />
                <span className="min-w-0 truncate">
                  {file ? file.name : 'Выбрать файл — PDF, скан или таблица'}
                </span>
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Примечание
              </Label>
              <Textarea
                value={a.note}
                onChange={(e) => setA({ ...a, note: e.target.value })}
                rows={2}
                className="rounded-sm"
              />
            </div>

            <Button
              onClick={saveAct}
              disabled={busy}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'Check'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              {busy ? 'Загружаем…' : 'Сохранить акт'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractsCabinet;
