import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import ObjectForm from '@/components/desk/ObjectForm';
import ObjectPage from '@/components/desk/ObjectPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useObjects,
  ProjectObject,
  groupByField,
  NO_FIELD,
  groupByLocation,
  inScope,
} from '@/data/store';
import { useLocations, locTitle, locIcon } from '@/data/locations';
import { useScope } from '@/data/scope';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SitesSectionProps {
  openId?: string | null;
  onOpen?: (id: string | null) => void;
}

const COLS = [
  { key: 'capacity', label: 'Мощность / протяжённость', w: 'w-[190px]' },
  { key: 'startYear', label: 'Год начала', w: 'w-[92px]' },
  { key: 'inspectors', label: 'Инспекторы', w: 'w-[100px]' },
  { key: 'vehicles', label: 'Техника', w: 'w-[86px]' },
  { key: 'cabins', label: 'Вагоны', w: 'w-[80px]' },
  { key: 'orders', label: 'Выдано предп.', w: 'w-[118px]' },
  { key: 'closed', label: 'Устранено', w: 'w-[96px]' },
  { key: 'endYear', label: 'План завершения', w: 'w-[130px]' },
] as const;

const cell = (o: ProjectObject, key: (typeof COLS)[number]['key']) => {
  switch (key) {
    case 'capacity':
      return o.capacity || '—';
    case 'startYear':
      return o.startYear || '—';
    case 'inspectors':
      return o.inspectors ?? 0;
    case 'vehicles':
      return o.vehicles ?? 0;
    case 'cabins':
      return o.cabins ?? 0;
    case 'orders':
      return o.orders ?? 0;
    case 'closed':
      return Math.max(0, (o.orders ?? 0) - (o.ordersOpen ?? 0));
    case 'endYear':
      return o.endYear || '—';
  }
};

const SitesSection = ({ openId = null, onOpen }: SitesSectionProps) => {
  const { list, add, loading } = useObjects();
  const { scope } = useScope();
  const { list: locations } = useLocations();
  const { profile, canAddObject } = useProfile();
  const { toast } = useToast();
  const [inner, setInner] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [query, setQuery] = useState('');

  const current = openId ?? inner;
  const setCurrent = (id: string | null) => {
    setInner(id);
    onOpen?.(id);
  };

  if (current) {
    return <ObjectPage id={current} onBack={() => setCurrent(null)} />;
  }

  const shown = inScope(list, scope).filter((o) =>
    query.trim()
      ? `${o.title} ${o.field} ${o.customer} ${o.regionName} ${locTitle(locations, o.location)}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      : true,
  );
  const locGroups = groupByLocation(shown, locations.map((l) => l.id)).map(
    ([loc, items]) => [loc, groupByField(items)] as const,
  );
  const fieldCount = locGroups.reduce((s, [, g]) => s + g.length, 0);

  const tryAdd = () => {
    if (!canAddObject) {
      toast({
        title: 'Недостаточно прав',
        description: `Добавлять объекты могут менеджер, координатор и руководитель проекта. Ваша роль: ${ROLE_LABEL[profile.role]}.`,
        variant: 'destructive',
      });
      return;
    }
    setForm(true);
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-0.5">
      <Panel
        title="Объекты по локациям"
        note={`${locGroups.length} локаций · ${fieldCount} проектов · ${shown.length} объектов`}
        className="min-h-0 flex-1"
        action={
          <Button
            size="sm"
            onClick={tryAdd}
            className={cn(
              'ml-3 h-8 gap-1.5 rounded-sm px-3 font-head text-[0.85em] uppercase tracking-[0.06em]',
              canAddObject
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-secondary text-muted-foreground hover:bg-secondary',
            )}
          >
            <Icon name={canAddObject ? 'Plus' : 'Lock'} size={14} />
            Добавить объект
          </Button>
        }
      >
        <div className="border-b border-border p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по локации, проекту, объекту, заказчику"
            className="h-9 w-full rounded-sm sm:w-96"
          />
        </div>

        {loading && list.length === 0 ? (
          <Empty icon="Loader" title="Загружаем данные с сервера" hint="Секунду…" />
        ) : shown.length === 0 ? (
          <Empty
            icon="Building2"
            title={list.length === 0 ? 'Объектов пока нет' : 'Ничего не найдено'}
            hint={
              list.length === 0
                ? canAddObject
                  ? 'Добавьте объект и укажите месторождение — он встанет в свою группу.'
                  : 'Объекты добавляет менеджер проекта.'
                : 'Измените поисковый запрос.'
            }
          />
        ) : (
          <div className="min-w-full overflow-x-auto">
            <div className="min-w-[1080px]">
              <div className="flex items-end gap-3 border-b-2 border-foreground/85 bg-secondary/40 px-4 py-2 text-[0.7em] uppercase leading-tight tracking-[0.08em] text-muted-foreground">
                <span className="min-w-0 flex-1">Объект контроля</span>
                {COLS.map((c) => (
                  <span key={c.key} className={cn('flex-none text-right', c.w)}>
                    {c.label}
                  </span>
                ))}
              </div>

              {locGroups.map(([loc, fields]) => {
                const all = fields.flatMap(([, i]) => i);
                const locSum = (fn: (o: ProjectObject) => number) =>
                  all.reduce((s, o) => s + (fn(o) || 0), 0);
                return (
                  <div key={loc || 'none'}>
                    <div className="flex items-end gap-3 border-b border-foreground/85 bg-foreground px-4 py-2.5 text-background">
                      <span className="min-w-0 flex-1 truncate font-head text-[1.25em] uppercase tracking-[0.03em]">
                        <Icon
                          name={locIcon(locations, loc)}
                          size={16}
                          className="mr-2 inline text-accent"
                        />
                        {locTitle(locations, loc)}
                        <span className="ml-2 text-[0.6em] tracking-[0.1em] opacity-70">
                          {fields.length} проект. · {all.length} об.
                        </span>
                      </span>
                      {COLS.map((c) => (
                        <span
                          key={c.key}
                          className={cn('flex-none text-right text-[0.85em] opacity-80', c.w)}
                        >
                          {c.key === 'inspectors'
                            ? locSum((o) => o.inspectors)
                            : c.key === 'vehicles'
                              ? locSum((o) => o.vehicles)
                              : c.key === 'cabins'
                                ? locSum((o) => o.cabins)
                                : c.key === 'orders'
                                  ? locSum((o) => o.orders)
                                  : c.key === 'closed'
                                    ? locSum((o) => o.orders - o.ordersOpen)
                                    : ''}
                        </span>
                      ))}
                    </div>

                    {fields.map(([fieldName, items]) => (
                      <div key={fieldName}>
                        <div className="flex items-end gap-3 border-b border-border bg-secondary/70 px-4 py-2">
                          <span className="min-w-0 flex-1 truncate font-head text-[0.95em] uppercase tracking-[0.04em]">
                            <Icon
                              name="Mountain"
                              size={13}
                              className="mr-2 inline text-muted-foreground"
                            />
                            {fieldName === NO_FIELD ? fieldName : fieldName}
                            <span className="ml-2 text-[0.72em] tracking-[0.1em] text-muted-foreground">
                              {items.length} об.
                            </span>
                          </span>
                          {COLS.map((c) => (
                            <span
                              key={c.key}
                              className={cn(
                                'flex-none text-right text-[0.8em] text-muted-foreground',
                                c.w,
                              )}
                            >
                              {c.key === 'inspectors'
                                ? items.reduce((s, o) => s + o.inspectors, 0)
                                : c.key === 'vehicles'
                                  ? items.reduce((s, o) => s + o.vehicles, 0)
                                  : c.key === 'cabins'
                                    ? items.reduce((s, o) => s + o.cabins, 0)
                                    : c.key === 'orders'
                                      ? items.reduce((s, o) => s + o.orders, 0)
                                      : c.key === 'closed'
                                        ? items.reduce((s, o) => s + o.orders - o.ordersOpen, 0)
                                        : ''}
                            </span>
                          ))}
                        </div>

                        {items.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setCurrent(o.id)}
                        className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 pl-7 text-left transition-colors hover:bg-secondary/70"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.95em]">{o.title}</span>
                          <span className="block truncate text-[0.78em] text-muted-foreground">
                            {o.kind === 'line' ? 'Линейный' : 'Площадочный'} · {o.regionName} ·{' '}
                            {o.customer}
                          </span>
                        </span>
                        {COLS.map((c) => (
                          <span
                            key={c.key}
                            className={cn(
                              'flex-none text-right text-[0.85em]',
                              c.w,
                              c.key === 'closed' && 'text-success',
                            )}
                          >
                            {cell(o, c.key)}
                          </span>
                        ))}
                      </button>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <ObjectForm
        open={form}
        onOpenChange={setForm}
        onSave={add}
        defaultLocation={scope.locationId}
        defaultProject={scope.project}
      />
    </div>
  );
};

export default SitesSection;