import { useMemo } from 'react';
import Icon from '@/components/ui/icon';
import Empty from '@/components/desk/Empty';
import { cn } from '@/lib/utils';
import { useLocations, locIcon } from '@/data/locations';
import { Vehicle } from '@/data/vehicles';

interface FleetMapProps {
  items: Vehicle[];
  activeLoc: string | null;
  onPick: (id: string | null) => void;
}

const FleetMap = ({ items, activeLoc, onPick }: FleetMapProps) => {
  const { list: locations } = useLocations();

  const cells = useMemo(() => {
    const rows = locations.map((l) => {
      const mine = items.filter((v) => v.locationId === l.id);
      return {
        id: l.id,
        title: l.title,
        icon: locIcon(locations, l.id),
        total: mine.length,
        line: mine.filter((v) => v.status === 'На линии').length,
        fix: mine.filter((v) => v.status === 'Ремонт' || v.status === 'ТО').length,
      };
    });
    const orphan = items.filter((v) => !locations.some((l) => l.id === v.locationId));
    if (orphan.length) {
      rows.push({
        id: '',
        title: 'Без локации',
        icon: 'MapPinOff',
        total: orphan.length,
        line: orphan.filter((v) => v.status === 'На линии').length,
        fix: orphan.filter((v) => v.status === 'Ремонт' || v.status === 'ТО').length,
      });
    }
    return rows;
  }, [locations, items]);

  if (!cells.length) {
    return <Empty icon="Map" title="Локаций пока нет" hint="Их заводит руководитель проекта." />;
  }

  return (
    <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
      {cells.map((c) => {
        const on = activeLoc === c.id;
        const tone = c.fix > 0 ? 'border-l-destructive' : c.total ? 'border-l-accent' : 'border-l-border';
        return (
          <button
            key={c.id || 'none'}
            type="button"
            onClick={() => onPick(on ? null : c.id)}
            className={cn(
              'flex items-center gap-3 rounded-sm border border-l-[3px] bg-card px-3 py-3 text-left transition-colors',
              tone,
              on ? 'border-accent bg-accent/10' : 'border-border hover:bg-secondary',
            )}
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={c.icon} fallback="MapPin" size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-head text-[0.9em] uppercase tracking-[0.04em]">
                {c.title}
              </span>
              <span className="block truncate text-[0.76em] text-muted-foreground">
                техники {c.total} · на линии {c.line}
                {c.fix ? ` · в ремонте ${c.fix}` : ''}
              </span>
            </span>
            {c.fix > 0 && (
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-sm bg-destructive/10 text-destructive">
                <Icon name="Wrench" size={13} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FleetMap;
