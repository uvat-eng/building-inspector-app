import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { Vehicle } from '@/data/vehicles';
import {
  REPAIR_LABEL,
  SOURCE_LABEL,
  money,
  ruDate,
  useFleet,
} from '@/data/fleet';

interface VehicleDossierProps {
  vehicles: Vehicle[];
}

type Tab = 'repairs' | 'expenses' | 'acts';

const VehicleDossier = ({ vehicles }: VehicleDossierProps) => {
  const { repairs, expenses, acts, shifts, loading } = useFleet();
  const [pick, setPick] = useState<string>(vehicles[0]?.id ?? '');
  const [tab, setTab] = useState<Tab>('repairs');

  const active = vehicles.find((v) => v.id === pick) ?? null;

  const mine = useMemo(
    () => ({
      repairs: repairs.filter((r) => r.vehicleId === pick),
      expenses: expenses.filter((e) => e.vehicleId === pick),
      acts: acts.filter((a) => a.vehicleId === pick),
      shifts: shifts.filter((s) => s.vehicleId === pick),
    }),
    [repairs, expenses, acts, shifts, pick],
  );

  const spent = mine.repairs.reduce((s, r) => s + (r.amount || 0), 0);
  const podotchet = mine.expenses.reduce((s, e) => s + (e.amount || 0), 0);

  const tabs: { k: Tab; l: string; n: number; i: string }[] = [
    { k: 'repairs', l: 'ТО и ремонты', n: mine.repairs.length, i: 'Wrench' },
    { k: 'expenses', l: 'Авансовые отчёты', n: mine.expenses.length, i: 'ReceiptText' },
    { k: 'acts', l: 'Акты и ведомости', n: mine.acts.length, i: 'FileText' },
  ];

  if (!vehicles.length) {
    return <Empty icon="Truck" title="Техники пока нет" hint="Добавьте первую машину." />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Panel title="Выберите единицу техники" className="flex-none">
        <div className="flex flex-wrap gap-1.5 p-3">
          {vehicles.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setPick(v.id)}
              className={cn(
                'max-w-[16rem] truncate rounded-sm border px-2.5 py-1.5 text-[0.82em] transition-colors',
                pick === v.id
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-input hover:bg-secondary',
              )}
            >
              {v.plate || 'б/н'} · {v.model}
            </button>
          ))}
        </div>
      </Panel>

      {active && (
        <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { l: 'Статус', v: active.status, i: 'Activity' },
            { l: 'Пробег, км', v: String(active.odometer || 0), i: 'Gauge' },
            { l: 'Затраты на ремонт, ₽', v: money(spent), i: 'Wallet' },
            { l: 'Подотчёт, ₽', v: money(podotchet), i: 'ReceiptText' },
          ].map((c) => (
            <div
              key={c.l}
              className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                <Icon name={c.i} fallback="Circle" size={19} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-head text-[1.05em] leading-none">{c.v}</span>
                <span className="mt-1 block truncate text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                  {c.l}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-none flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className={cn(
              'flex items-center gap-2 rounded-sm border px-3 py-2 text-[0.84em] font-head uppercase tracking-[0.05em] transition-colors',
              tab === t.k
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-card hover:bg-secondary',
            )}
          >
            <Icon name={t.i} size={15} />
            {t.l}
            <span className="opacity-70">{t.n}</span>
          </button>
        ))}
      </div>

      <Panel
        title={active ? `${active.plate || 'б/н'} · ${active.model}` : 'Досье'}
        className="min-h-0 flex-1"
      >
        {loading ? (
          <Empty icon="Loader" title="Загружаем" hint="Секунду." />
        ) : tab === 'repairs' ? (
          !mine.repairs.length ? (
            <Empty icon="Wrench" title="Записей нет" hint="ТО и ремонты появятся здесь." />
          ) : (
            <div className="scrollbar-thin h-full overflow-y-auto">
              <div className="flex flex-col divide-y divide-border">
                {mine.repairs.map((r) => (
                  <div key={r.id} className="flex flex-col gap-1.5 px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'flex-none rounded-sm border px-2 py-0.5 text-[0.72em] uppercase tracking-[0.06em]',
                          r.kind === 'service'
                            ? 'border-accent text-accent'
                            : 'border-destructive text-destructive',
                        )}
                      >
                        {REPAIR_LABEL[r.kind] ?? r.kind}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.86em]">
                        {r.title || 'Без названия'}
                      </span>
                      <span className="flex-none font-head text-[0.86em]">
                        {money(r.amount)} ₽
                      </span>
                    </div>
                    <span className="text-[0.74em] text-muted-foreground">
                      {ruDate(r.repairDate)}
                      {r.odometer ? ` · ${r.odometer} км` : ''} · внёс {r.author || '—'}
                    </span>
                    {r.parts && (
                      <span className="text-[0.78em] text-muted-foreground">{r.parts}</span>
                    )}
                    {r.photos?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.photos.map((p) => (
                          <a key={p} href={p} target="_blank" rel="noreferrer">
                            <img
                              src={p}
                              alt="фото"
                              className="h-14 w-14 rounded-sm border border-border object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : tab === 'expenses' ? (
          !mine.expenses.length ? (
            <Empty
              icon="ReceiptText"
              title="Отчётов нет"
              hint="Авансовые отчёты водителя попадут сюда."
            />
          ) : (
            <div className="scrollbar-thin h-full overflow-y-auto">
              <div className="flex flex-col divide-y divide-border">
                {mine.expenses.map((e) => (
                  <div key={e.id} className="flex flex-col gap-1 px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'flex-none rounded-sm border px-2 py-0.5 text-[0.72em] uppercase tracking-[0.06em]',
                          e.source === 'podotchet'
                            ? 'border-accent text-accent'
                            : 'border-amber-500 text-amber-600',
                        )}
                      >
                        {SOURCE_LABEL[e.source] ?? e.source}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.86em]">{e.title}</span>
                      <span className="flex-none font-head text-[0.86em]">
                        {money(e.amount)} ₽
                      </span>
                    </div>
                    <span className="text-[0.74em] text-muted-foreground">
                      {ruDate(e.expDate)} · {e.qty} {e.unit} · {e.driverFio || e.author}
                    </span>
                    {e.photos?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {e.photos.map((p) => (
                          <a key={p} href={p} target="_blank" rel="noreferrer">
                            <img
                              src={p}
                              alt="чек"
                              className="h-14 w-14 rounded-sm border border-border object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : !mine.acts.length ? (
          <Empty
            icon="FileText"
            title="Актов нет"
            hint="Акты передачи вахты и ведомости списания появятся здесь."
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-y-auto">
            <div className="flex flex-col divide-y divide-border">
              {mine.acts.map((a) => (
                <div key={a.id} className="flex flex-col gap-1.5 px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex-none rounded-sm border border-border px-2 py-0.5 text-[0.72em] uppercase tracking-[0.06em] text-muted-foreground">
                      {a.kind === 'writeoff' ? 'Ведомость списания' : 'Акт передачи вахты'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.86em]">
                      № {a.actNo || '—'} от {ruDate(a.actDate)}
                    </span>
                    <span className="flex-none text-[0.78em] text-muted-foreground">
                      позиций {a.items?.length ?? 0}
                    </span>
                  </div>
                  <span className="text-[0.74em] text-muted-foreground">
                    сдал {a.driverFio || '—'}
                    {a.acceptFio ? ` · принял ${a.acceptFio}` : ''}
                    {a.odometer ? ` · ${a.odometer} км` : ''}
                  </span>
                  {a.condition && (
                    <span className="text-[0.78em] text-muted-foreground">{a.condition}</span>
                  )}
                  {a.items?.length > 0 && (
                    <div className="flex flex-col gap-0.5 rounded-sm border border-border bg-secondary/30 p-2">
                      {a.items.map((it, i) => (
                        <span key={i} className="text-[0.78em]">
                          {i + 1}. {it.title} — {it.qty} {it.unit}
                          {it.note ? ` · ${it.note}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {a.photos?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {a.photos.map((p) => (
                        <a key={p} href={p} target="_blank" rel="noreferrer">
                          <img
                            src={p}
                            alt="фото"
                            className="h-14 w-14 rounded-sm border border-border object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default VehicleDossier;
