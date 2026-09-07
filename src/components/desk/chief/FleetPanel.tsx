import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { cn } from '@/lib/utils';
import { useChiefScope } from '@/data/chief';
import { useVehicles, KIND_LABEL, Vehicle } from '@/data/vehicles';

interface FleetPanelProps {
  onBack?: () => void;
}

const ruDate = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

const daysTo = (v?: string) => {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 86400000);
};

const statusTone = (s: string) =>
  s === 'На линии' ? 'ok' : s === 'ТО' ? 'wait' : s === 'Ремонт' ? 'hot' : 'dim';

const FleetPanel = ({ onBack }: FleetPanelProps) => {
  const { objects, objectIds, wide } = useChiefScope();
  const { items, loading } = useVehicles();
  const [open, setOpen] = useState<string | null>(null);

  const fleet = useMemo(
    () =>
      (items ?? []).filter(
        (v: Vehicle) => v.assetType === 'vehicle' && (wide || objectIds.includes(v.objectId)),
      ),
    [items, wide, objectIds],
  );

  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? '—';

  const counters = [
    { icon: 'Truck', label: 'Единиц техники', value: fleet.length },
    {
      icon: 'CircleCheck',
      label: 'На линии',
      value: fleet.filter((v) => v.status === 'На линии').length,
    },
    {
      icon: 'Wrench',
      label: 'ТО и ремонт',
      value: fleet.filter((v) => v.status === 'ТО' || v.status === 'Ремонт').length,
    },
    {
      icon: 'TriangleAlert',
      label: 'ТО в ближайшие 14 дней',
      value: fleet.filter((v) => {
        const d = daysTo(v.serviceAt);
        return d !== null && d <= 14;
      }).length,
    },
  ];

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          К обзору
        </button>
      )}

      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
        <h1 className="font-head text-[1.05em] uppercase leading-tight tracking-[0.03em]">
          Транспорт на объектах
        </h1>
        <p className="mt-1 text-[0.85em] text-muted-foreground">
          Пробег, состояние, прошедшее и следующее ТО, время работы
        </p>
      </section>

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
              <span className="block font-head text-[22px] leading-none">{c.value}</span>
              <span className="mt-1 block truncate text-[0.74em] uppercase tracking-[0.08em] text-muted-foreground">
                {c.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <Panel title="Автопарк" note={`${fleet.length}`}>
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Загружаем технику…
          </p>
        ) : fleet.length === 0 ? (
          <Empty
            icon="Truck"
            title="Техники нет"
            hint="Техника появится после закрепления за вашими объектами."
          />
        ) : (
          fleet.map((v) => {
            const left = daysTo(v.serviceAt);
            return (
              <div key={v.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpen((p) => (p === v.id ? null : v.id))}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                    <Icon name="Truck" size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.92em]">
                      {v.model || 'Без модели'} · {v.plate || 'без номера'}
                    </span>
                    <span className="block truncate text-[0.76em] text-muted-foreground">
                      {KIND_LABEL[v.kind]} · пробег {(v.odometer || 0).toLocaleString('ru')} км ·{' '}
                      {v.driver || 'без водителя'} · {objTitle(v.objectId)}
                    </span>
                  </span>
                  {left !== null && left <= 14 && (
                    <Tag tone="hot">{left < 0 ? 'ТО просрочено' : `ТО через ${left} дн.`}</Tag>
                  )}
                  <Tag tone={statusTone(v.status) as never}>{v.status}</Tag>
                  <Icon
                    name={open === v.id ? 'ChevronDown' : 'ChevronRight'}
                    size={16}
                    className="flex-none text-muted-foreground"
                  />
                </button>

                {open === v.id && (
                  <div className="grid gap-x-4 gap-y-1.5 px-4 pb-3 pl-16 text-[0.82em] sm:grid-cols-2">
                    {[
                      ['Инвентарный номер', v.invNo || '—'],
                      ['Модель и тип', `${v.model || '—'} · ${KIND_LABEL[v.kind]}`],
                      ['Государственный номер', v.plate || '—'],
                      ['Водитель', v.driver || '—'],
                      ['Пробег', `${(v.odometer || 0).toLocaleString('ru')} км`],
                      ['Норма расхода', v.fuelNorm ? `${v.fuelNorm} л/100 км` : '—'],
                      ['Следующее ТО', ruDate(v.serviceAt)],
                      ['ОСАГО до', ruDate(v.osagoTo)],
                      ['Состояние', v.status],
                      ['Объект', objTitle(v.objectId)],
                    ].map(([label, value]) => (
                      <span key={String(label)} className="flex justify-between gap-2">
                        <span className="truncate text-muted-foreground">{label}</span>
                        <span className={cn('font-head', 'text-right')}>{value}</span>
                      </span>
                    ))}
                    {v.note && (
                      <p className="text-muted-foreground sm:col-span-2">{v.note}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>
    </div>
  );
};

export default FleetPanel;
