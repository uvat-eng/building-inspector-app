import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import CabinetBar from '@/components/desk/CabinetBar';
import ChangePassword from '@/components/desk/ChangePassword';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useProfile } from '@/data/profile';
import { useUsers } from '@/data/users';
import { useChiefScope } from '@/data/chief';
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

const VIEW_TITLE: Record<View, string> = {
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
  material: 'Заявки на материалы и обеспечение',
  ticket: 'Заявки на покупку билетов',
  expense: 'Авансовые отчёты',
};

interface ChiefCabinetProps {
  onExit?: () => void;
}

interface Tile {
  id: View;
  icon: string;
  title: string;
  note: string;
}

const TILES: Tile[][] = [
  [
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
      note: 'Суммарно по всем инспекторам в подчинении',
    },
    {
      id: 'doccontrol',
      icon: 'FolderCheck',
      title: 'Отчёт по документации',
      note: 'Проверка ИТД и ПСД · учёт файлов подрядчиков',
    },
    {
      id: 'photos',
      icon: 'Camera',
      title: 'Фотоотчёты',
      note: 'Фотоотчёты инспекторов по объектам',
    },
    {
      id: 'tables',
      icon: 'Table2',
      title: 'Отчёты таблицы',
      note: 'Сводки по объектам и подрядчикам',
    },
    {
      id: 'geodesy',
      icon: 'Ruler',
      title: 'Акты дубля геодезии',
      note: 'Фото с телефона или файл · свод по объектам',
    },
    {
      id: 'card',
      icon: 'ClipboardCheck',
      title: 'Контрольные карточки объектов',
      note: 'Сводка уходит в раздел объекта',
    },
  ],
  [
    {
      id: 'staffsheet',
      icon: 'CalendarClock',
      title: 'Табель инспекторов',
      note: 'Пообъектно · табель проекта для бухгалтерии и кадров',
    },
    {
      id: 'techsheet',
      icon: 'IdCard',
      title: 'Табель водителей',
      note: 'Смены и часы по каждому водителю',
    },
    {
      id: 'vehsheet',
      icon: 'Truck',
      title: 'Табель транспорта',
      note: 'Часы работы, простои, ТО и ремонт по машинам',
    },
    {
      id: 'cabinsheet',
      icon: 'Container',
      title: 'Табель вагонов и бытовок',
      note: 'Дни эксплуатации по каждому вагон-дому',
    },
    {
      id: 'fleet',
      icon: 'Gauge',
      title: 'Транспорт',
      note: 'Пробег, состояние, прошедшее и следующее ТО',
    },
    {
      id: 'material',
      icon: 'PackagePlus',
      title: 'Заявки на материалы и обеспечение',
      note: 'Расходники, инструмент, спецодежда',
    },
    {
      id: 'ticket',
      icon: 'Plane',
      title: 'Заявки на покупку билетов',
      note: 'Проезд на вахту и обратно',
    },
    {
      id: 'expense',
      icon: 'Receipt',
      title: 'Авансовый отчёт',
      note: 'Уходит руководителю проекта на утверждение',
    },
  ],
];

const ChiefCabinet = ({ onExit }: ChiefCabinetProps) => {
  const { profile } = useProfile();
  const { current } = useUsers();
  const { objects, inspectors, team, drivers } = useChiefScope();
  const [view, setView] = useState<View>('home');
  const [passOpen, setPassOpen] = useState(false);

  const counters = useMemo(
    () => [
      { icon: 'Building2', label: 'Мои объекты', value: objects.length },
      { icon: 'Users', label: 'Инспекторов', value: inspectors.length },
      { icon: 'Truck', label: 'Водителей', value: drivers.length },
      { icon: 'HardHat', label: 'Всего в бригаде', value: team.length },
    ],
    [objects.length, inspectors.length, drivers.length, team.length],
  );

  const passButton = (
    <button
      type="button"
      onClick={() => setPassOpen(true)}
      className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
    >
      <Icon name="KeyRound" size={13} className="text-accent" />
      Пароль
    </button>
  );

  const passDialog = (
    <Dialog open={passOpen} onOpenChange={setPassOpen}>
      <DialogContent className="max-w-sm rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.1em] uppercase tracking-[0.03em]">
            Смена пароля
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Новый пароль вступает в силу сразу.
          </DialogDescription>
        </DialogHeader>
        {current && <ChangePassword user={current} onDone={() => setPassOpen(false)} />}
      </DialogContent>
    </Dialog>
  );

  const bar = (
    <CabinetBar
      crumbs={[
        {
          label: 'Старший инспектор',
          icon: 'ShieldCheck',
          onClick: view === 'home' ? undefined : () => setView('home'),
        },
        ...(view !== 'home' ? [{ label: VIEW_TITLE[view] }] : []),
      ]}
      backLabel={view === 'home' ? undefined : 'К обзору'}
      onBack={view === 'home' ? undefined : () => setView('home')}
      onExit={onExit}
      actions={passButton}
    />
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
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {bar}

      {view === 'home' ? (
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-5">
            <h1 className="font-head text-[1.5em] uppercase leading-none tracking-[0.02em]">
              Кабинет <span className="text-accent">старшего инспектора</span>
            </h1>
            <p className="mt-1.5 text-[0.86em] text-muted-foreground">
              {profile.fio} · {profile.org}
            </p>
            <p className="mt-0.5 text-[0.82em] text-muted-foreground">
              Видны только закреплённые объекты и подчинённые инспекторы. Закрепление выполняет
              руководитель проекта или директор.
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

          {objects.length === 0 && (
            <Panel title="Объекты не закреплены">
              <Empty
                icon="Building2"
                title="За вами пока нет объектов"
                hint="Руководитель проекта или директор закрепляет объекты в разделе «Персонал»."
              />
            </Panel>
          )}

          {TILES.map((group, gi) => (
            <div key={gi} className="grid flex-none gap-2.5">
              {gi === 1 && (
                <p className="mt-1 text-[0.74em] uppercase tracking-[0.12em] text-muted-foreground">
                  Управление бригадой
                </p>
              )}
              {group.map((t) => (
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
        </div>
      ) : (
        body()
      )}

      {passDialog}
    </div>
  );
};

export default ChiefCabinet;
