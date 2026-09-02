import { useMemo } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useObjects, groupByLocation, groupByField, NO_FIELD } from '@/data/store';
import { useLocations, locTitle, locIcon } from '@/data/locations';
import { InspectorRollup } from '@/data/rollup';
import { MARKS, MONTHS, fmtHours } from '@/data/timesheet';
import { useToast } from '@/hooks/use-toast';

interface Props {
  items: InspectorRollup[];
  month: number;
  year: number;
}

const CODES = ['Я', ...MARKS.map((m) => m.code)];

const BrigadeTimesheet = ({ items, month, year }: Props) => {
  const { list: objects } = useObjects();
  const { list: locations } = useLocations();
  const { toast } = useToast();
  const days = new Date(year, month + 1, 0).getDate();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const objById = useMemo(() => new Map(objects.map((o) => [o.id, o])), [objects]);

  const tree = useMemo(() => {
    const rest: InspectorRollup[] = [];
    const byObj = new Map<string, InspectorRollup[]>();
    items.forEach((i) => {
      const oid = i.objectIds?.[0];
      if (oid && objById.has(oid)) byObj.set(oid, [...(byObj.get(oid) ?? []), i]);
      else rest.push(i);
    });

    const used = objects.filter((o) => byObj.has(o.id));
    const groups = groupByLocation(used, locations.map((l) => l.id)).map(
      ([loc, list]) =>
        [
          loc,
          groupByField(list).map(
            ([field, objs]) =>
              [field, objs.flatMap((o) => byObj.get(o.id) ?? [])] as const,
          ),
        ] as const,
    );
    return { groups, rest };
  }, [items, objects, objById, locations]);

  const countCode = (i: InspectorRollup, code: string) =>
    Object.entries(i.codes ?? {}).filter(([d, c]) => d.startsWith(prefix) && c === code).length;

  const dayCode = (i: InspectorRollup, d: number) =>
    i.codes?.[`${prefix}-${String(d).padStart(2, '0')}`] ?? '';

  const share = () => {
    const rows: string[][] = [
      [`СВОДКА ПЕРСОНАЛА ЗА ${MONTHS[month]} ${year} г.`],
      [],
      ['№', 'Ф.И.О.', 'Должность', ...Array.from({ length: days }, (_, i) => String(i + 1)), ...CODES, 'Часы'],
    ];
    let n = 0;
    const push = (label: string, list: InspectorRollup[]) => {
      rows.push([label]);
      list.forEach((i) => {
        n += 1;
        rows.push([
          String(n),
          i.fio,
          'Инспектор строительного контроля',
          ...Array.from({ length: days }, (_, d) => dayCode(i, d + 1)),
          ...CODES.map((c) => String(countCode(i, c))),
          fmtHours(i.monthHours),
        ]);
      });
    };
    tree.groups.forEach(([loc, fields]) =>
      fields.forEach(([field, list]) =>
        push(`${locTitle(locations, loc)} · ${field === NO_FIELD ? 'без проекта' : field}`, list),
      ),
    );
    if (tree.rest.length) push('Без привязки к объекту', tree.rest);

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Сводка_персонала_${MONTHS[month]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: 'Сводка выгружена', description: 'Файл открывается в Excel.' });
  };

  const row = (i: InspectorRollup, n: number) => (
    <div
      key={i.id}
      className="flex items-center gap-2 border-b border-border px-3 py-2 text-[0.8em] hover:bg-secondary/50"
    >
      <span className="w-6 flex-none text-muted-foreground">{n}</span>
      <span className="w-52 flex-none truncate">
        <span className="block truncate">{i.fio}</span>
        <span className="block truncate text-[0.82em] text-muted-foreground">
          {i.onShift ? 'на вахте' : 'вне вахты'}
        </span>
      </span>
      <span className="flex flex-none gap-px">
        {Array.from({ length: days }).map((_, d) => {
          const c = dayCode(i, d + 1);
          return (
            <span
              key={d}
              className={cn(
                'flex h-6 w-6 flex-none items-center justify-center rounded-[2px] text-[0.72em]',
                c === 'Я'
                  ? 'bg-accent/20 text-accent'
                  : c
                    ? 'bg-warning/20 text-warning'
                    : 'bg-secondary/60 text-muted-foreground/40',
              )}
            >
              {c || '·'}
            </span>
          );
        })}
      </span>
      {CODES.map((c) => (
        <span
          key={c}
          className={cn(
            'w-8 flex-none text-center',
            countCode(i, c) ? 'font-head' : 'text-muted-foreground/40',
          )}
        >
          {countCode(i, c)}
        </span>
      ))}
      <span className="w-14 flex-none text-right font-head">{fmtHours(i.monthHours)}</span>
    </div>
  );

  let num = 0;

  return (
    <Panel
      title={`Сводка персонала · ${MONTHS[month]} ${year}`}
      note={`${items.length} чел.`}
      action={
        <Button
          size="sm"
          onClick={share}
          className="ml-3 h-8 gap-1.5 rounded-sm bg-accent px-3 font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name="Download" size={14} />
          Выгрузить
        </Button>
      }
    >
      {items.length === 0 ? (
        <Empty
          icon="Users"
          title="Нет данных по персоналу"
          hint="Инспекторы появятся здесь, как только начнут отмечать дни в табеле."
        />
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex items-center gap-2 border-b-2 border-foreground/85 bg-secondary/40 px-3 py-2 text-[0.68em] uppercase tracking-[0.06em] text-muted-foreground">
              <span className="w-6 flex-none">№</span>
              <span className="w-52 flex-none">Ф.И.О.</span>
              <span className="flex flex-none gap-px">
                {Array.from({ length: days }).map((_, d) => (
                  <span key={d} className="w-6 flex-none text-center">
                    {d + 1}
                  </span>
                ))}
              </span>
              {CODES.map((c) => (
                <span key={c} className="w-8 flex-none text-center">
                  {c}
                </span>
              ))}
              <span className="w-14 flex-none text-right">Часы</span>
            </div>

            {tree.groups.map(([loc, fields]) => (
              <div key={loc || 'none'}>
                <div className="flex items-center gap-2 border-b border-foreground/85 bg-foreground px-3 py-2 text-background">
                  <Icon name={locIcon(locations, loc)} size={15} className="text-accent" />
                  <span className="font-head text-[1.05em] uppercase tracking-[0.03em]">
                    {locTitle(locations, loc)}
                  </span>
                  <span className="text-[0.7em] tracking-[0.1em] opacity-70">
                    {fields.reduce((s, [, l]) => s + l.length, 0)} чел.
                  </span>
                </div>
                {fields.map(([field, list]) => (
                  <div key={field}>
                    <div className="flex items-center gap-2 border-b border-border bg-secondary/70 px-3 py-1.5">
                      <Icon name="Mountain" size={12} className="text-muted-foreground" />
                      <span className="font-head text-[0.85em] uppercase tracking-[0.04em]">
                        {field === NO_FIELD ? 'Без проекта' : field}
                      </span>
                      <span className="text-[0.72em] text-muted-foreground">{list.length} чел.</span>
                    </div>
                    {list.map((i) => {
                      num += 1;
                      return row(i, num);
                    })}
                  </div>
                ))}
              </div>
            ))}

            {tree.rest.length > 0 && (
              <div>
                <div className="flex items-center gap-2 border-b border-border bg-secondary/70 px-3 py-1.5">
                  <Icon name="CircleHelp" size={12} className="text-muted-foreground" />
                  <span className="font-head text-[0.85em] uppercase tracking-[0.04em]">
                    Без привязки к объекту
                  </span>
                  <span className="text-[0.72em] text-muted-foreground">
                    {tree.rest.length} чел.
                  </span>
                </div>
                {tree.rest.map((i) => {
                  num += 1;
                  return row(i, num);
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
};

export default BrigadeTimesheet;