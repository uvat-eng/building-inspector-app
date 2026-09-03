import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AssetForm from '@/components/desk/assets/AssetForm';
import { useProfile } from '@/data/profile';
import {
  AssetType,
  ASSET_ICON,
  ASSET_LABEL,
  KIND_LABEL,
  Vehicle,
  daysLeft,
  fmtDate,
  useVehicles,
} from '@/data/vehicles';

const TABS: AssetType[] = ['vehicle', 'cabin', 'device'];

const EMPTY_TEXT: Record<AssetType, { title: string; hint: string }> = {
  vehicle: {
    title: 'Техника не внесена',
    hint: 'Добавьте автомобили и спецтехнику, чтобы вести пробег, ТО и ОСАГО.',
  },
  cabin: {
    title: 'Вагонов и бытовок нет',
    hint: 'Внесите жилые и штабные вагоны с привязкой к объекту и ответственному.',
  },
  device: {
    title: 'Приборы не внесены',
    hint: 'Добавьте измерительный инструмент, чтобы контролировать сроки поверки.',
  },
};

const AssetsSection = () => {
  const { canManageAssets } = useProfile();
  const [tab, setTab] = useState<AssetType>('vehicle');
  const { items, loading, create, update, remove } = useVehicles(tab);

  const [form, setForm] = useState(false);
  const [edit, setEdit] = useState<Vehicle | null>(null);

  const openNew = () => {
    setEdit(null);
    setForm(true);
  };

  const openEdit = (v: Vehicle) => {
    if (!canManageAssets) return;
    setEdit(v);
    setForm(true);
  };

  const title = (v: Vehicle) => {
    if (v.assetType === 'vehicle') return `${v.plate} · ${v.model}`;
    return `${v.model}${v.invNo ? ` · инв. ${v.invNo}` : ''}`;
  };

  const sub = (v: Vehicle) => {
    if (v.assetType === 'vehicle') {
      return `${KIND_LABEL[v.kind] ?? v.kind} · ${v.driver || 'водитель не закреплён'} · ${v.odometer} км`;
    }
    if (v.assetType === 'cabin') return `${v.kind} · ${v.holder || 'ответственный не назначен'}`;
    return `${v.kind} · поверка до ${fmtDate(v.verifiedTo)} · ${v.holder || 'без ответственного'}`;
  };

  const right = (v: Vehicle) => {
    if (v.assetType === 'device') {
      const d = daysLeft(v.verifiedTo);
      if (d !== null && d <= 30) {
        return <Tag tone="hot">{d < 0 ? 'Поверка просрочена' : 'Поверка истекает'}</Tag>;
      }
    }
    return <Tag tone="dim">{v.status}</Tag>;
  };

  const row = (v: Vehicle) => (
    <Row key={v.id} title={title(v)} sub={sub(v)} right={right(v)} onClick={() => openEdit(v)} />
  );

  const expiring =
    tab === 'device'
      ? items.filter((v) => {
          const d = daysLeft(v.verifiedTo);
          return d !== null && d <= 30;
        })
      : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 rounded-sm border px-3 py-1.5 font-head text-[0.82em] uppercase tracking-[0.08em] transition-colors',
              tab === t
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-input hover:bg-secondary',
            )}
          >
            <Icon name={ASSET_ICON[t]} size={14} />
            {ASSET_LABEL[t]}
          </button>
        ))}
        {canManageAssets && (
          <Button
            size="sm"
            onClick={openNew}
            className="ml-auto h-8 gap-1.5 rounded-sm bg-accent px-3 font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="Plus" size={14} />
            Добавить
          </Button>
        )}
      </div>

      {expiring.length > 0 && (
        <Panel title="Требуют поверки" note={`${expiring.length}`}>
          {expiring.map(row)}
        </Panel>
      )}

      <Panel title={ASSET_LABEL[tab]} note={`${items.length}`}>
        {loading ? (
          <Empty icon="Loader2" title="Загрузка" />
        ) : items.length === 0 ? (
          <Empty
            icon={ASSET_ICON[tab]}
            title={EMPTY_TEXT[tab].title}
            hint={EMPTY_TEXT[tab].hint}
          />
        ) : (
          items.map(row)
        )}
      </Panel>

      <AssetForm
        open={form}
        onClose={() => setForm(false)}
        tab={tab}
        item={edit}
        create={create}
        update={update}
        remove={remove}
      />
    </div>
  );
};

export default AssetsSection;
