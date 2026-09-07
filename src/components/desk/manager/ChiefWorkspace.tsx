import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { User } from '@/data/users';
import { useChiefScope } from '@/data/chief';
import ObjectLoadBoard from '@/components/desk/chief/ObjectLoadBoard';
import ByInspector from '@/components/desk/chief/ByInspector';
import TeamTimesheet from '@/components/desk/chief/TeamTimesheet';
import AssetTimesheet from '@/components/desk/chief/AssetTimesheet';
import FleetPanel from '@/components/desk/chief/FleetPanel';
import RequestsCabinet from '@/components/desk/chief/RequestsCabinet';
import RollupCabinet from '@/components/desk/rollup/RollupCabinet';
import DocControlCabinet from '@/components/desk/docs/DocControlCabinet';
import PhotosSection from '@/components/desk/sections/PhotosSection';
import ObjectDocsCabinet from '@/components/desk/objectdocs/ObjectDocsCabinet';

type View =
  | 'home'
  | 'indreports'
  | 'journal'
  | 'rollup'
  | 'doccontrol'
  | 'photos'
  | 'tables'
  | 'geodesy'
  | 'card'
  | 'staffsheet'
  | 'techsheet'
  | 'vehsheet'
  | 'cabinsheet'
  | 'fleet'
  | 'material'
  | 'ticket'
  | 'expense';

interface Tile {
  id: View;
  icon: string;
  title: string;
  note: string;
}

const TILES: { group: string; items: Tile[] }[] = [
  {
    group: 'Отчётность бригады',
    items: [
      {
        id: 'indreports',
        icon: 'ClipboardPen',
        title: 'Индивидуальные отчёты инспекторов',
        note: 'Пофамильно · внутри по датам, свежие сверху',
      },
      {
        id: 'journal',
        icon: 'BookText',
        title: 'Индивидуальные журналы ИСК',
        note: 'Пофамильно · записи каждого инспектора',
      },
      {
        id: 'rollup',
        icon: 'FileSpreadsheet',
        title: 'Свод замечаний и предписаний',
        note: 'Суммарно по инспекторам этого старшего',
      },
      {
        id: 'doccontrol',
        icon: 'FolderCheck',
        title: 'Отчёт по документации',
        note: 'Проверка ИТД и ПСД · учёт файлов подрядчиков',
      },
      { id: 'photos', icon: 'Camera', title: 'Фотоотчёты', note: 'Фотоотчёты по объектам' },
      { id: 'tables', icon: 'Table2', title: 'Отчёты таблицы', note: 'Сводки по объектам' },
      {
        id: 'geodesy',
        icon: 'Ruler',
        title: 'Акты дубля геодезии',
        note: 'Свод по объектам бригады',
      },
      {
        id: 'card',
        icon: 'ClipboardCheck',
        title: 'Контрольные карточки объектов',
        note: 'Сводка по объектам',
      },
    ],
  },
  {
    group: 'Табели и обеспечение',
    items: [
      {
        id: 'staffsheet',
        icon: 'CalendarClock',
        title: 'Табель инспекторов',
        note: 'Пообъектно · выгрузка для бухгалтерии',
      },
      { id: 'techsheet', icon: 'IdCard', title: 'Табель водителей', note: 'Смены и часы' },
      {
        id: 'vehsheet',
        icon: 'Truck',
        title: 'Табель транспорта',
        note: 'Работа, простои, ТО и ремонт',
      },
      {
        id: 'cabinsheet',
        icon: 'Container',
        title: 'Табель вагонов и бытовок',
        note: 'Дни эксплуатации',
      },
      {
        id: 'fleet',
        icon: 'Gauge',
        title: 'Транспорт',
        note: 'Пробег, состояние, следующее ТО',
      },
      {
        id: 'material',
        icon: 'PackagePlus',
        title: 'Заявки на материалы',
        note: 'Расходники, инструмент, спецодежда',
      },
      { id: 'ticket', icon: 'Plane', title: 'Заявки на билеты', note: 'Проезд на вахту' },
      {
        id: 'expense',
        icon: 'Receipt',
        title: 'Авансовые отчёты',
        note: 'Утверждение руководителем проекта',
      },
    ],
  },
];

const TITLE: Record<View, string> = {
  home: 'Обзор',
  indreports: 'Индивидуальные отчёты инспекторов',
  journal: 'Индивидуальные журналы ИСК',
  rollup: 'Свод замечаний и предписаний',
  doccontrol: 'Отчёт по документации',
  photos: 'Фотоотчёты',
  tables: 'Отчёты таблицы',
  geodesy: 'Акты дубля геодезии',
  card: 'Контрольные карточки объектов',
  staffsheet: 'Табель инспекторов',
  techsheet: 'Табель водителей',
  vehsheet: 'Табель транспорта',
  cabinsheet: 'Табель вагонов и бытовок',
  fleet: 'Транспорт',
  material: 'Заявки на материалы',
  ticket: 'Заявки на билеты',
  expense: 'Авансовые отчёты',
};

interface ChiefWorkspaceProps {
  chief: User;
  onBack: () => void;
}

const ChiefWorkspace = ({ chief, onBack }: ChiefWorkspaceProps) => {
  const { objects, inspectors, drivers, team } = useChiefScope();
  const [view, setView] = useState<View>('home');

  const counters = useMemo(
    () => [
      { icon: 'Building2', label: 'Объектов', value: objects.length },
      { icon: 'Users', label: 'Инспекторов', value: inspectors.length },
      { icon: 'Truck', label: 'Водителей', value: drivers.length },
      { icon: 'HardHat', label: 'Всего в бригаде', value: team.length },
    ],
    [objects.length, inspectors.length, drivers.length, team.length],
  );

  const body = () => {
    switch (view) {
      case 'indreports':
        return <ByInspector kind="indreports" />;
      case 'journal':
        return <ByInspector kind="journal" />;
      case 'rollup':
        return <RollupCabinet />;
      case 'doccontrol':
        return <DocControlCabinet />;
      case 'photos':
        return <PhotosSection />;
      case 'tables':
        return <ObjectDocsCabinet section="tables" />;
      case 'geodesy':
        return <ObjectDocsCabinet section="geodesy" />;
      case 'card':
        return <ObjectDocsCabinet section="card" />;
      case 'staffsheet':
        return <TeamTimesheet mode="staff" />;
      case 'techsheet':
        return <TeamTimesheet mode="tech" />;
      case 'vehsheet':
        return <AssetTimesheet kind="vehicle" />;
      case 'cabinsheet':
        return <AssetTimesheet kind="cabin" />;
      case 'fleet':
        return <FleetPanel />;
      case 'material':
        return <RequestsCabinet kind="material" />;
      case 'ticket':
        return <RequestsCabinet kind="ticket" />;
      case 'expense':
        return <RequestsCabinet kind="expense" />;
      default:
        return null;
    }
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="flex flex-none flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={view === 'home' ? onBack : () => setView('home')}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          {view === 'home' ? 'К старшим инспекторам' : 'К обзору бригады'}
        </button>
        {view !== 'home' && (
          <span className="text-[0.78em] uppercase tracking-[0.08em] text-muted-foreground">
            {TITLE[view]}
          </span>
        )}
      </div>

      {view === 'home' ? (
        <>
          <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
            <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
              Кабинет старшего инспектора
            </p>
            <h2 className="mt-1 font-head text-[1.2em] uppercase leading-tight tracking-[0.02em]">
              {chief.fio}
            </h2>
            <p className="mt-1 text-[0.84em] text-muted-foreground">
              Вся информация в разрезе его объектов и подчинённых инспекторов
              {chief.phone ? ` · ${chief.phone}` : ''}
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

          <ObjectLoadBoard
            objects={objects}
            canEdit
            title="Люди и техника на его объектах"
            note="план / факт · история по дням"
          />

          {TILES.map((g) => (
            <div key={g.group} className="grid flex-none gap-2.5">
              <p className="mt-1 text-[0.74em] uppercase tracking-[0.12em] text-muted-foreground">
                {g.group}
              </p>
              {g.items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setView(t.id)}
                  className={cn(
                    'group flex items-center gap-3 rounded-sm border border-border border-t-2',
                    'border-t-accent bg-card px-4 py-4 text-left transition-colors',
                    'hover:bg-foreground hover:text-background',
                  )}
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                    <Icon name={t.icon} fallback="Circle" size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                      {t.title}
                    </span>
                    <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                      {t.note}
                    </span>
                  </span>
                  <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
                </button>
              ))}
            </div>
          ))}
        </>
      ) : (
        body()
      )}
    </div>
  );
};

export default ChiefWorkspace;
