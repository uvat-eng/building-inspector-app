import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import Empty from '@/components/desk/Empty';
import { REGIONS, INSPECTORS, INSPECTIONS } from '@/data/mock';
import { useObjects, summarize, money, STATUS_LABEL } from '@/data/store';

const ReportsSection = () => {
  const { list: OBJECTS } = useObjects();
  const s = summarize(OBJECTS);
  const [region, setRegion] = useState<string | null>(REGIONS[0]?.id ?? null);
  const active = REGIONS.find((r) => r.id === region) ?? null;

  const KPI = [
    { label: 'Портфель контрактов', value: money(s.portfolio), note: `${s.total} объектов`, icon: 'Wallet' },
    { label: 'Объектов в работе', value: String(s.inWork), note: `выездов ${INSPECTIONS.length}`, icon: 'Building2' },
    { label: 'Предписаний выдано', value: String(s.orders), note: `не устранено ${s.ordersOpen}`, icon: 'FileWarning' },
    { label: 'Инспекторов в штате', value: String(INSPECTORS.length), note: 'по группам', icon: 'Users' },
  ];

  return (
    <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-2 lg:grid-rows-2">
      <Panel title="Ключевые показатели" note="за всё время">
        <div className="grid grid-cols-2 gap-3 p-3">
          {KPI.map((k, i) => (
            <div
              key={k.label}
              className="animate-fade-in rounded-sm border border-border p-3"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Icon name={k.icon} size={18} className="text-accent" />
              <div className="mt-2 font-head text-2xl">{k.value}</div>
              <div className="text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
                {k.label}
              </div>
              <div className="mt-1 text-[0.8em] text-success">{k.note}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Регионы и автономные группы" note="модуль руководителя">
        {REGIONS.length === 0 && (
          <Empty
            icon="Map"
            title="Регионы не заведены"
            hint="Добавьте автономную группу: проекты, инспекторы, автомобили."
          />
        )}
        <div className={REGIONS.length === 0 ? 'hidden' : 'p-3'}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRegion(r.id)}
                className={`rounded-sm px-3 py-1.5 text-[0.85em] transition-colors ${
                  region === r.id
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-border'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
          {active && (
            <div className="animate-fade-in rounded-sm bg-deep p-4 text-deep-foreground" key={active.id}>
              <div className="font-head text-lg uppercase tracking-[0.06em]">{active.name}</div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                {[
                  ['Проекты', active.projects],
                  ['Инспекторы', active.inspectors],
                  ['Автомобили', active.cars],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-sm bg-deep-2 py-3">
                    <div className="font-head text-xl">{v}</div>
                    <div className="text-[0.72em] uppercase tracking-[0.12em] text-deep-dim">{k}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[0.78em] uppercase tracking-[0.1em] text-deep-dim">
                  <span>Загрузка группы</span>
                  <span className="text-accent">{active.load}%</span>
                </div>
                <div className="h-2 rounded-sm bg-deep-2">
                  <div
                    className="h-2 rounded-sm bg-accent transition-all duration-700"
                    style={{ width: `${active.load}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Результативность инспекторов" note="снято / выдано">
        {INSPECTORS.length === 0 && <Empty icon="Users" title="Данных по инспекторам нет" />}
        {INSPECTORS.map((n) => (
          <Row
            key={n.id}
            title={n.name}
            sub={`${n.project} · ${n.hours} ч в табеле`}
            right={
              <span className="flex-none text-[0.85em]">
                <span className="text-success">{n.closed}</span>
                <span className="text-muted-foreground"> / {n.orders}</span>
              </span>
            }
          />
        ))}
      </Panel>

      <Panel title="Сроки договоров" note="риск срыва">
        {OBJECTS.length === 0 && <Empty icon="CalendarRange" title="Договоров нет" />}
        {OBJECTS.slice(0, 6).map((o) => (
          <Row
            key={o.id}
            title={o.title}
            sub={`Срок ${o.deadline || '—'} · готовность ${o.progress}% · ${o.customer}`}
            right={<Tag tone={o.status === 'done' ? 'ok' : o.status === 'plan' ? 'wait' : 'hot'}>{STATUS_LABEL[o.status]}</Tag>}
          />
        ))}
      </Panel>
    </div>
  );
};

export default ReportsSection;