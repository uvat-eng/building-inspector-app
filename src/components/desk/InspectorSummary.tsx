import Icon from '@/components/ui/icon';
import { ProjectObject } from '@/data/store';
import { useSummary } from '@/data/inspections';

interface InspectorSummaryProps {
  objects: ProjectObject[];
}

const InspectorSummary = ({ objects }: InspectorSummaryProps) => {
  const s = useSummary();

  const cards = [
    {
      icon: 'Building2',
      label: 'Мои объекты',
      value: String(objects.length),
      note: objects.length ? 'закреплены за вами' : 'объекты не назначены',
    },
    {
      icon: 'ClipboardCheck',
      label: 'Проверок проведено',
      value: String(s.inspections),
      note: 'актов осмотра',
    },
    {
      icon: 'TriangleAlert',
      label: 'Замечаний выдано',
      value: String(s.defects),
      note: 'по всем актам',
    },
    {
      icon: 'FileWarning',
      label: 'Предписаний оформлено',
      value: String(s.orders),
      note: 'передано подрядчику',
    },
  ];

  return (
    <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="flex items-center gap-3 bg-card px-4 py-3.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
            <Icon name={c.icon} fallback="Circle" size={19} />
          </span>
          <span className="min-w-0">
            <span className="block font-head text-[1.5em] leading-none">{c.value}</span>
            <span className="block truncate text-[0.78em] uppercase tracking-[0.1em] text-muted-foreground">
              {c.label}
            </span>
            <span className="block truncate text-[0.74em] text-muted-foreground/80">{c.note}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

export default InspectorSummary;
