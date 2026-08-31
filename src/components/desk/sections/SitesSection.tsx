import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import ObjectForm from '@/components/desk/ObjectForm';
import ObjectPage from '@/components/desk/ObjectPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useObjects, money, ProjectObject, STATUS_LABEL } from '@/data/store';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import { useToast } from '@/hooks/use-toast';
import type { TagTone } from '@/data/mock';

const TONE: Record<ProjectObject['status'], TagTone> = {
  work: 'hot',
  plan: 'wait',
  done: 'ok',
  risk: 'hot',
};

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'work', label: 'В работе' },
  { id: 'plan', label: 'Подготовка' },
  { id: 'risk', label: 'Риск срыва' },
  { id: 'done', label: 'Завершённые' },
] as const;

interface SitesSectionProps {
  openId?: string | null;
  onOpen?: (id: string | null) => void;
}

const SitesSection = ({ openId = null, onOpen }: SitesSectionProps) => {
  const { list, add } = useObjects();
  const { profile, canAddObject } = useProfile();
  const { toast } = useToast();
  const [inner, setInner] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [query, setQuery] = useState('');

  const current = openId ?? inner;
  const setCurrent = (id: string | null) => {
    setInner(id);
    onOpen?.(id);
  };

  if (current) {
    return <ObjectPage id={current} onBack={() => setCurrent(null)} />;
  }

  const shown = list
    .filter((o) => (filter === 'all' ? true : o.status === filter))
    .filter((o) =>
      query.trim()
        ? `${o.title} ${o.customer} ${o.regionName} ${o.contractNo}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        : true,
    );

  const tryAdd = () => {
    if (!canAddObject) {
      toast({
        title: 'Недостаточно прав',
        description: `Добавлять объекты может только заместитель директора заказчика. Ваша роль: ${ROLE_LABEL[profile.role]}.`,
        variant: 'destructive',
      });
      return;
    }
    setForm(true);
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-0.5">
      <Panel
        title="Объекты строительства"
        note={`${shown.length} из ${list.length}`}
        className="min-h-0 flex-1"
        action={
          <Button
            size="sm"
            onClick={tryAdd}
            className={`ml-3 h-8 gap-1.5 rounded-sm px-3 font-head text-[0.85em] uppercase tracking-[0.06em] ${
              canAddObject
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-secondary text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Icon name={canAddObject ? 'Plus' : 'Lock'} size={14} />
            Добавить объект
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-sm px-2.5 py-1 text-[0.8em] uppercase tracking-[0.06em] transition-colors ${
                filter === f.id
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-border'
              }`}
            >
              {f.label}
            </button>
          ))}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, заказчику, договору"
            className="ml-auto h-8 w-full rounded-sm sm:w-72"
          />
        </div>

        {shown.length === 0 ? (
          <Empty
            icon="Building2"
            title={list.length === 0 ? 'Объектов пока нет' : 'Ничего не найдено'}
            hint={
              list.length === 0
                ? canAddObject
                  ? 'Нажмите «Добавить объект»: заказчик, договор, точка на карте, ресурсы.'
                  : 'Объекты добавляет заместитель директора заказчика.'
                : 'Измените фильтр или поисковый запрос.'
            }
          />
        ) : (
          shown.map((o) => (
            <Row
              key={o.id}
              title={o.title}
              sub={`${o.regionName} · ${o.customer} · ${o.stage} · ${money(o.contractSum)} · готовность ${o.progress}%`}
              onClick={() => setCurrent(o.id)}
              right={<Tag tone={TONE[o.status]}>{STATUS_LABEL[o.status]}</Tag>}
            />
          ))
        )}
      </Panel>

      <ObjectForm open={form} onOpenChange={setForm} onSave={add} />
    </div>
  );
};

export default SitesSection;
