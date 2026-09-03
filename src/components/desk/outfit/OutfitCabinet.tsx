import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import PpeCabinet from '@/components/desk/outfit/PpeCabinet';
import EquipmentCabinet from '@/components/desk/outfit/EquipmentCabinet';

type Tab = 'menu' | 'ppe' | 'equipment';

interface OutfitCabinetProps {
  onBack: () => void;
}

const OutfitCabinet = ({ onBack }: OutfitCabinetProps) => {
  const [tab, setTab] = useState<Tab>('menu');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={() => (tab === 'menu' ? onBack() : setTab('menu'))}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        {tab === 'menu' ? 'В кабинет' : 'К разделу'}
      </button>

      {tab === 'menu' ? (
        <div className="grid flex-none gap-px overflow-hidden rounded-sm border border-border border-t-2 border-t-accent bg-border sm:grid-cols-2">
          {[
            {
              id: 'ppe' as Tab,
              icon: 'Shirt',
              label: 'Спецодежда',
              note: 'Учёт выдачи, сроки носки, списание',
            },
            {
              id: 'equipment' as Tab,
              icon: 'Wrench',
              label: 'Оборудование',
              note: 'Приёмка на вахту, поверки, передача',
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'group flex items-center gap-3 bg-card px-4 py-5 text-left transition-colors',
                'hover:bg-foreground hover:text-background',
              )}
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name={t.icon} fallback="Circle" size={23} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[1.05em] uppercase tracking-[0.03em]">
                  {t.label}
                </span>
                <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                  {t.note}
                </span>
              </span>
              <Icon name="ChevronRight" size={17} className="ml-auto flex-none opacity-40" />
            </button>
          ))}
        </div>
      ) : tab === 'ppe' ? (
        <PpeCabinet />
      ) : (
        <EquipmentCabinet />
      )}
    </div>
  );
};

export default OutfitCabinet;
