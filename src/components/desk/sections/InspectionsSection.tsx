import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import { INSPECTIONS, VEHICLES, INSPECTORS, REQUESTS } from '@/data/mock';

const FILTERS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'planned', label: 'Запланировано' },
  { id: 'done', label: 'Выполнено' },
] as const;

const InspectionsSection = () => {
  const [filter, setFilter] = useState<'today' | 'planned' | 'done'>('today');
  const list = INSPECTIONS.filter((i) => i.status === filter);

  return (
    <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-2 lg:grid-rows-2">
      <Panel
        title="График выездов"
        note={`${list.length} записей`}
        action={
          <span className="ml-3 flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-sm px-2 py-1 text-[0.85em] tracking-[0.04em] transition-colors ${
                  filter === f.id
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-border'
                }`}
              >
                {f.label}
              </button>
            ))}
          </span>
        }
      >
        {list.map((i, idx) => (
          <Row
            key={i.id}
            title={i.title}
            sub={`${i.sub} · ${i.type}`}
            unread={filter === 'today' && idx === 0}
            right={
              <span className="flex-none text-[0.8em] tracking-[0.03em] text-muted-foreground">
                {i.time}
              </span>
            }
          />
        ))}
      </Panel>

      <Panel title="Автомобили и водители" note="4 в группе">
        {VEHICLES.map((v) => (
          <Row
            key={v.id}
            title={`${v.plate} · ${v.model}`}
            sub={`${v.driver} · ${v.fuel} · ${v.service}`}
            right={
              <Tag tone={v.status === 'На линии' ? 'ok' : v.status === 'ТО' ? 'wait' : 'dim'}>
                {v.status}
              </Tag>
            }
          />
        ))}
      </Panel>

      <Panel title="Табель инспекторов" note="август">
        {INSPECTORS.map((n) => (
          <Row
            key={n.id}
            title={`${n.name} — ${n.role}`}
            sub={`${n.project} · ${n.hours} ч · предписаний ${n.orders}`}
            right={
              <span className="flex-none text-[0.8em] text-muted-foreground">
                снято {n.closed}
              </span>
            }
          />
        ))}
      </Panel>

      <Panel title="Заявки: материалы, запчасти, проживание" note={`${REQUESTS.length}`}>
        {REQUESTS.map((r) => (
          <Row key={r.id} title={r.title} sub={r.who} right={<Tag tone={r.tone}>{r.tag}</Tag>} />
        ))}
        <div className="flex items-center gap-2 px-4 py-3 text-[0.82em] text-muted-foreground">
          <Icon name="Info" size={14} className="text-accent" />
          Путевые листы формируются автоматически: сутки · месяц · год
        </div>
      </Panel>
    </div>
  );
};

export default InspectionsSection;
