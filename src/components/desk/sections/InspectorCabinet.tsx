import { useEffect, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import Timesheet from '@/components/desk/Timesheet';
import { useObjects } from '@/data/store';
import { useSummary } from '@/data/inspections';
import ReportsCabinet from '@/components/desk/inspection/ReportsCabinet';
import ObjectMenuAlerts from '@/components/desk/inspection/ObjectMenuAlerts';
import { useOrders } from '@/data/orders';
import { runDailyArchive } from '@/data/rollup';
import {
  useTimesheet,
  monthEntries,
  isMark,
  currentShift,
  MONTHS,
} from '@/data/timesheet';
import { cn } from '@/lib/utils';
import InspectorProfile from '@/components/desk/InspectorProfile';
import { useUsers } from '@/data/users';
import DocsCabinet from '@/components/desk/DocsCabinet';
import InspectionsCabinet from '@/components/desk/inspection/InspectionsCabinet';
import OrdersCabinet from '@/components/desk/inspection/OrdersCabinet';
import ContractorCard from '@/components/desk/inspection/ContractorCard';
import FoldersCabinet from '@/components/desk/inspection/FoldersCabinet';
import CabinetBar from '@/components/desk/CabinetBar';
import useBackGuard from '@/hooks/use-back-guard';
import OutfitCabinet from '@/components/desk/outfit/OutfitCabinet';
import DefectsSection from '@/components/desk/sections/DefectsSection';
import { downloadOrder, downloadOrdersDigest } from '@/lib/orderDoc';
import IndReportsCabinet from '@/components/desk/indreports/IndReportsCabinet';
import RollupCabinet from '@/components/desk/rollup/RollupCabinet';
import JournalCabinet from '@/components/desk/journal/JournalCabinet';
import PhotosSection from '@/components/desk/sections/PhotosSection';
import DocControlCabinet from '@/components/desk/docs/DocControlCabinet';
import ObjectDocsCabinet from '@/components/desk/objectdocs/ObjectDocsCabinet';
import HandbookCabinet from '@/components/desk/handbook/HandbookCabinet';

type View =
  | 'home'
  | 'objects'
  | 'timesheet'
  | 'defects'
  | 'ordersAll'
  | 'indreports'
  | 'rollup'
  | 'journal'
  | 'photos'
  | 'doccontrol'
  | 'handbook'
  | 'tables'
  | 'geodesy'
  | 'card'
  | 'profile'
  | 'outfit';

type ObjView =
  | 'menu'
  | 'docs'
  | 'contract'
  | 'reports'
  | 'inspections'
  | 'orders'
  | 'company'
  | 'tests'
  | 'ks'
  | 'incoming'
  | 'pos';

const VIEW_TITLE: Record<View, string> = {
  home: 'Обзор',
  objects: 'Мои объекты',
  timesheet: 'Табель учёта времени',
  defects: 'Замечания по всем объектам',
  ordersAll: 'Предписания по всем объектам',
  indreports: 'Индивидуальные ежедневные отчёты',
  rollup: 'Свод замечаний и предписаний',
  journal: 'Индивидуальный журнал ИСК',
  photos: 'Фотоотчёты',
  doccontrol: 'Отчёт по документации',
  handbook: 'Справочник типовых нарушений',
  tables: 'Отчёты таблицы',
  geodesy: 'Акты дубля геодезии',
  card: 'Контрольная карточка объекта',
  profile: 'Профиль инспектора',
  outfit: 'Оборудование и спецодежда',
};

interface InspectorCabinetProps {
  onExit?: () => void;
}

const InspectorCabinet = ({ onExit }: InspectorCabinetProps) => {
  const [view, setView] = useState<View>('home');

  useEffect(() => {
    runDailyArchive();
  }, []);

  const [openObject, setOpenObject] = useState<string | null>(null);
  const [objectView, setObjectView] = useState<ObjView>('menu');

  useEffect(() => {
    setObjectView('menu');
  }, [openObject]);

  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { sheet } = useTimesheet();
  const { current } = useUsers();
  const summary = useSummary();
  const { items: allOrders } = useOrders();
  const spec = profile.specialties ?? [];

  const now = new Date();
  const month = monthEntries(sheet, now.getFullYear(), now.getMonth()).filter(
    ([, l]) => !isMark(l),
  );
  const shift = currentShift(sheet);

  const stats: { icon: string; label: string; value: string | number; view: View }[] = [
    { icon: 'Building2', label: 'Объекты', value: objects.length, view: 'objects' },
    {
      icon: 'Clock',
      label: `Табель · вахта / ${MONTHS[now.getMonth()].toLowerCase()}`,
      value: `${shift?.workDays ?? 0} / ${month.length}`,
      view: 'timesheet',
    },
    { icon: 'TriangleAlert', label: 'Замечания', value: summary.defects, view: 'defects' },
    { icon: 'FileWarning', label: 'Предписания', value: summary.orders, view: 'ordersAll' },
  ];

  const objectsPanel = (
    <Panel title="Мои объекты" note={`${objects.length}`}>
      {objects.length === 0 ? (
        <Empty
          icon="Building2"
          title="Объекты не назначены"
          hint="Обратитесь к менеджеру проекта."
        />
      ) : (
        objects.map((o) => (
          <Row
            key={o.id}
            title={o.title}
            sub={`${o.regionName} · ${o.stage}`}
            onClick={() => {
              setOpenObject(o.id);
              setObjectView('menu');
            }}
          />
        ))
      )}
    </Panel>
  );

  useBackGuard(view !== 'home' && !openObject, () => setView('home'));
  useBackGuard(!!openObject && objectView !== 'menu', () => setObjectView('menu'));
  useBackGuard(!!openObject && objectView === 'menu', () => {
    setOpenObject(null);
    setView('objects');
  });

  const active = objects.find((o) => o.id === openObject);

  const OBJ_VIEW_TITLE: Record<ObjView, string> = {
    menu: 'Разделы объекта',
    docs: 'Документация',
    contract: 'Договор',
    reports: 'Отчёты',
    inspections: 'Проверки и выезды',
    orders: 'Предписания',
    company: 'Подрядчик',
    tests: 'Протоколы испытаний',
    ks: 'Акты КС',
    incoming: 'Входящие документы',
    pos: 'ПОС и ППР',
  };

  const objectCrumbs = active && (
    <CabinetBar
      crumbs={[
        {
          label: 'Кабинет',
          icon: 'IdCard',
          onClick: () => {
            setOpenObject(null);
            setObjectView('menu');
            setView('objects');
          },
        },
        { label: active.title, onClick: () => setObjectView('menu') },
        ...(objectView !== 'menu' ? [{ label: OBJ_VIEW_TITLE[objectView] }] : []),
      ]}
      backLabel="К списку объектов"
      onBack={
        objectView === 'menu'
          ? () => {
              setOpenObject(null);
              setView('objects');
            }
          : undefined
      }
      onExit={onExit}
    />
  );

  const wrap = (node: React.ReactNode) => (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {objectCrumbs}
      <div className="flex min-h-0 flex-1 flex-col">{node}</div>
    </div>
  );

  if (active) {
    if (objectView === 'docs' || objectView === 'contract') {
      return wrap(
        <DocsCabinet
          object={active}
          onBack={() => setObjectView('menu')}
          only={objectView === 'contract' ? 'contract' : undefined}
        />,
      );
    }
    if (objectView === 'reports') {
      return wrap(<ReportsCabinet object={active} onBack={() => setObjectView('menu')} />);
    }
    if (objectView === 'inspections') {
      return wrap(
        <InspectionsCabinet
          object={active}
          onBack={() => setObjectView('menu')}
          onOrdersOpen={() => setObjectView('orders')}
        />,
      );
    }
    if (objectView === 'orders') {
      return wrap(<OrdersCabinet object={active} onBack={() => setObjectView('menu')} />);
    }
    if (objectView === 'company') {
      return wrap(<ContractorCard object={active} onBack={() => setObjectView('menu')} />);
    }
    if (objectView === 'tests' || objectView === 'ks' || objectView === 'incoming') {
      return wrap(
        <FoldersCabinet
          object={active}
          section={objectView}
          onBack={() => setObjectView('menu')}
        />,
      );
    }
    if (objectView === 'pos') {
      return wrap(
        <DocsCabinet
          object={active}
          onBack={() => setObjectView('menu')}
          sections={['pos', 'ppr']}
          title="ПОС и ППР"
          hint="Загрузка вручную инспектором. Прикрепите сканы ПОС и ППР в формате PDF или фото."
        />,
      );
    }
    return wrap(
      <ObjectMenuAlerts
        object={active}
        onBack={() => {
          setOpenObject(null);
          setView('objects');
        }}
        onOpen={(id) => {
          if (
            [
              'docs',
              'contract',
              'reports',
              'inspections',
              'orders',
              'company',
              'tests',
              'ks',
              'incoming',
              'pos',
            ].includes(id)
          )
            setObjectView(id as ObjView);
        }}
      />,
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <CabinetBar
        crumbs={[
          { label: 'Кабинет инспектора', icon: 'IdCard', onClick: () => setView('home') },
          ...(view !== 'home' ? [{ label: VIEW_TITLE[view] }] : []),
        ]}
        backLabel="К обзору"
        onBack={view !== 'home' ? () => setView('home') : undefined}
        onExit={onExit}
        actions={
          <button
            type="button"
            onClick={() => setView('profile')}
            className={cn(
              'flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors',
              view === 'profile'
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-card hover:border-accent hover:bg-secondary',
            )}
          >
            <Icon name="UserCog" size={14} />
            Мой профиль
          </button>
        }
      />

      {view === 'home' && (
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
          <section className="rounded-sm border border-border border-t-2 border-t-accent bg-card px-5 py-5 sm:px-7 sm:py-6">
            <h1 className="font-head text-[22px] uppercase leading-[1.1] tracking-[0.02em] sm:text-[34px]">
              Инспектор <span className="text-accent">строительного контроля</span>
            </h1>

            <p className="mt-3 font-head text-[1.15em] uppercase tracking-[0.04em] sm:text-[1.35em]">
              {profile.fio || 'ФИО не указано'}
            </p>

            <p className="mt-1 text-[0.9em] text-muted-foreground">
              {profile.group ? `Проект «${profile.group}»` : 'Проект не назначен'} · {profile.org}
            </p>

            <div className="mt-4 border-t border-border pt-3">
              <span className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
                Специализация
              </span>
              {spec.length === 0 ? (
                <p className="mt-1.5 text-[0.88em] text-muted-foreground">
                  Не указана — заполните в карточке пользователя.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {spec.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1.5 rounded-sm bg-secondary px-2.5 py-1 text-[0.82em] text-secondary-foreground"
                    >
                      <Icon name="BadgeCheck" size={13} className="text-accent" />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!!current && (
              <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3 text-[0.85em]">
                <span className="flex items-center gap-1.5">
                  <Icon name="ShieldCheck" size={14} className="text-accent" />
                  Удостоверений: <b>{current.certificates?.length ?? 0}</b>
                </span>
                <span className="flex items-center gap-1.5">
                  <Icon name="GraduationCap" size={14} className="text-accent" />
                  Документов об образовании: <b>{current.educations?.length ?? 0}</b>
                </span>
                <button
                  type="button"
                  onClick={() => setView('profile')}
                  className="ml-auto flex items-center gap-1.5 text-accent hover:underline"
                >
                  Заполнить в профиле
                  <Icon name="ArrowRight" size={13} />
                </button>
              </div>
            )}

            {profile.role !== 'inspector' && (
              <p className="mt-4 flex items-center gap-2 rounded-sm bg-secondary/60 p-3 text-[0.82em] text-muted-foreground">
                <Icon name="Info" size={14} className="flex-none text-accent" />
                Вы вошли как «{ROLE_LABEL[profile.role]}» — кабинет показан в режиме просмотра.
              </p>
            )}
          </section>

          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setView(s.view)}
                className="group flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5 text-left transition-colors hover:border-accent hover:bg-secondary/50"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon name={s.icon} fallback="Circle" size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block font-head text-[1.5em] leading-none">{s.value}</span>
                  <span className="block truncate text-[0.78em] uppercase tracking-[0.1em] text-muted-foreground">
                    {s.label}
                  </span>
                </span>
                <Icon
                  name="ChevronRight"
                  size={16}
                  className="ml-auto flex-none text-muted-foreground/40 transition-colors group-hover:text-accent"
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setView('rollup')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="FileSpreadsheet" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Свод замечаний и предписаний
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                Сводный отчёт по предписаниям и журнал замечаний по форме заказчика
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <button
            type="button"
            onClick={() => setView('handbook')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="BookMarked" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Справочник типовых нарушений
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                2085 нарушений по 14 разделам работ · пункты НтД и поиск
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <button
            type="button"
            onClick={() => setView('indreports')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="ClipboardPen" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Индивидуальный ежедневный отчёт
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                6 видов формы · архив по годам, месяцам и дням
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <button
            type="button"
            onClick={() => setView('journal')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="BookText" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Индивидуальный журнал ИСК
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                Заполнение по объектам · выгрузка Excel и отправка заказчику
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <button
            type="button"
            onClick={() => setView('doccontrol')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="FolderCheck" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Отчёт по документации
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                Проверка ИТД и ПСД · учёт файлов по подрядчикам
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <button
            type="button"
            onClick={() => setView('photos')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="Camera" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Фотоотчёты
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                Съёмка с подписями · папки по месяцам · печать и выгрузка
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <button
            type="button"
            onClick={() => setView('tables')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="Table2" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Отчёты таблицы
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                Сводки по объектам и подрядчикам · ручная корректировка в Excel
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <button
            type="button"
            onClick={() => setView('geodesy')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="Ruler" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Акты дубля геодезии
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                Фото с телефона или файл · хранение и свод по объектам
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <button
            type="button"
            onClick={() => setView('card')}
            className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="ClipboardCheck" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-head text-[1em] uppercase tracking-[0.04em]">
                Контрольная карточка объекта
              </span>
              <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                Сводка уходит в раздел объекта · доступна всей команде
              </span>
            </span>
            <Icon name="ArrowRight" size={17} className="flex-none text-accent" />
          </button>

          <div className="grid min-h-0 gap-3.5">
            <Timesheet />
            <button
              type="button"
              onClick={() => setView('outfit')}
              className="group flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 text-left transition-colors hover:bg-foreground hover:text-background"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name="HardHat" fallback="Shirt" size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[1.05em] uppercase tracking-[0.03em]">
                  Оборудование и спецодежда
                </span>
                <span className="block truncate text-[0.8em] text-muted-foreground group-hover:text-background/70">
                  Учёт СИЗ и приборов, списание и передача на вахте
                </span>
              </span>
              <Icon name="ChevronRight" size={17} className="ml-auto flex-none opacity-40" />
            </button>
          </div>
        </div>
      )}

      {view === 'profile' &&
        (current ? (
          <InspectorProfile user={current} />
        ) : (
          <Panel title="Профиль инспектора">
            <Empty
              icon="UserCog"
              title="Профиль недоступен"
              hint="Войдите в систему под своей учётной записью."
            />
          </Panel>
        ))}

      {view === 'objects' && (
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
          {objectsPanel}
        </div>
      )}

      {view === 'outfit' && <OutfitCabinet onBack={() => setView('home')} />}

      {view === 'timesheet' && (
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Timesheet />
        </div>
      )}

      {view === 'defects' && <DefectsSection />}

      {view === 'indreports' && <IndReportsCabinet onBack={() => setView('home')} />}

      {view === 'rollup' && <RollupCabinet onBack={() => setView('home')} />}

      {view === 'journal' && <JournalCabinet onBack={() => setView('home')} />}

      {view === 'photos' && <PhotosSection onBack={() => setView('home')} />}

      {view === 'doccontrol' && <DocControlCabinet onBack={() => setView('home')} />}

      {view === 'handbook' && <HandbookCabinet onBack={() => setView('home')} />}

      {view === 'tables' && (
        <ObjectDocsCabinet section="tables" onBack={() => setView('home')} />
      )}

      {view === 'geodesy' && (
        <ObjectDocsCabinet section="geodesy" onBack={() => setView('home')} />
      )}

      {view === 'card' && <ObjectDocsCabinet section="card" onBack={() => setView('home')} />}

      {view === 'ordersAll' && (
        <Panel
          title="Предписания по всем объектам"
          note={`${allOrders.length}`}
          action={
            allOrders.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  downloadOrdersDigest(allOrders, {
                    title: 'Сводный реестр по всем объектам',
                    objectTitle: (o) =>
                      objects.find((ob) => ob.id === o.objectId)?.title ?? 'Объект',
                  })
                }
                className="ml-3 flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.82em] tracking-[0.04em] text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Icon name="FileDown" size={14} />
                Сводный отчёт
              </button>
            ) : undefined
          }
        >
          {allOrders.length === 0 ? (
            <Empty
              icon="FileWarning"
              title="Предписаний нет"
              hint="Оформите предписание из акта проверки."
            />
          ) : (
            allOrders.map((o) => (
              <Row
                key={o.id}
                title={`Предписание № ${o.number}`}
                sub={[
                  objects.find((ob) => ob.id === o.objectId)?.title ?? 'Объект',
                  o.issuedTo || '—',
                  new Date(o.createdAt).toLocaleDateString('ru'),
                ].join(' · ')}
                onClick={() =>
                  downloadOrder(o, null)
                }
                right={<Tag tone={o.status === 'done' ? 'ok' : 'wait'}>{o.deadline || '—'}</Tag>}
              />
            ))
          )}
        </Panel>
      )}
    </div>
  );
};

export default InspectorCabinet;