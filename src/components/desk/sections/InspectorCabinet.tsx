import { useEffect, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import Timesheet from '@/components/desk/Timesheet';
import { useObjects } from '@/data/store';
import { useSummary, useAllDefects, SEVERITY } from '@/data/inspections';
import { useOrders } from '@/data/orders';
import { runDailyArchive } from '@/data/rollup';
import {
  useTimesheet,
  monthEntries,
  isMO,
  currentShift,
  MONTHS,
} from '@/data/timesheet';
import { cn } from '@/lib/utils';
import InspectorProfile from '@/components/desk/InspectorProfile';
import { useUsers } from '@/data/users';
import ObjectMenu from '@/components/desk/ObjectMenu';
import DocsCabinet from '@/components/desk/DocsCabinet';
import InspectionsCabinet from '@/components/desk/inspection/InspectionsCabinet';
import OrdersCabinet from '@/components/desk/inspection/OrdersCabinet';
import ContractorCard from '@/components/desk/inspection/ContractorCard';
import FoldersCabinet from '@/components/desk/inspection/FoldersCabinet';

type View = 'home' | 'objects' | 'timesheet' | 'defects' | 'ordersAll' | 'profile';

const VIEW_KEY = 'gsi-cabinet-view-v1';
const OBJ_KEY = 'gsi-cabinet-object-v1';
const OBJ_VIEW_KEY = 'gsi-cabinet-object-view-v1';

type ObjView =
  | 'menu'
  | 'docs'
  | 'contract'
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
  profile: 'Профиль инспектора',
};

interface InspectorCabinetProps {
  onExit?: () => void;
}

const InspectorCabinet = ({ onExit }: InspectorCabinetProps) => {
  const [view, setView] = useState<View>(
    () => (localStorage.getItem(VIEW_KEY) as View) || 'home',
  );

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    runDailyArchive();
  }, []);

  const [openObject, setOpenObject] = useState<string | null>(
    () => localStorage.getItem(OBJ_KEY),
  );
  const [objectView, setObjectView] = useState<ObjView>(
    () => (localStorage.getItem(OBJ_VIEW_KEY) as ObjView) || 'menu',
  );

  useEffect(() => {
    if (openObject) localStorage.setItem(OBJ_KEY, openObject);
    else localStorage.removeItem(OBJ_KEY);
    localStorage.setItem(OBJ_VIEW_KEY, objectView);
  }, [openObject, objectView]);

  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { sheet } = useTimesheet();
  const { current } = useUsers();
  const summary = useSummary();
  const { items: allDefects, loading: defectsLoading } = useAllDefects();
  const { items: allOrders } = useOrders();
  const spec = profile.specialties ?? [];

  const now = new Date();
  const month = monthEntries(sheet, now.getFullYear(), now.getMonth()).filter(
    ([, l]) => !isMO(l),
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

  const active = objects.find((o) => o.id === openObject);

  if (active) {
    if (objectView === 'docs' || objectView === 'contract') {
      return (
        <DocsCabinet
          object={active}
          onBack={() => setObjectView('menu')}
          only={objectView === 'contract' ? 'contract' : undefined}
        />
      );
    }
    if (objectView === 'inspections') {
      return (
        <InspectionsCabinet
          object={active}
          onBack={() => setObjectView('menu')}
          onOrdersOpen={() => setObjectView('orders')}
        />
      );
    }
    if (objectView === 'orders') {
      return <OrdersCabinet object={active} onBack={() => setObjectView('menu')} />;
    }
    if (objectView === 'company') {
      return <ContractorCard object={active} onBack={() => setObjectView('menu')} />;
    }
    if (objectView === 'tests' || objectView === 'ks' || objectView === 'incoming') {
      return (
        <FoldersCabinet
          object={active}
          section={objectView}
          onBack={() => setObjectView('menu')}
        />
      );
    }
    if (objectView === 'pos') {
      return (
        <DocsCabinet
          object={active}
          onBack={() => setObjectView('menu')}
          sections={['pos', 'ppr']}
          title="ПОС и ППР"
          hint="Загрузка вручную инспектором. Прикрепите сканы ПОС и ППР в формате PDF или фото."
        />
      );
    }
    return (
      <ObjectMenu
        object={active}
        onBack={() => setOpenObject(null)}
        onOpen={(id) => {
          if (
            [
              'docs',
              'contract',
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
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex flex-none flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[0.82em] uppercase tracking-[0.08em]">
          <button
            type="button"
            onClick={() => setView('home')}
            className={cn(
              'flex items-center gap-1.5 rounded-sm px-2 py-1 transition-colors',
              view === 'home'
                ? 'text-muted-foreground'
                : 'hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon name="IdCard" size={14} className="text-accent" />
            Кабинет инспектора
          </button>
          {view !== 'home' && (
            <>
              <Icon name="ChevronRight" size={13} className="text-muted-foreground/50" />
              <span className="font-head tracking-[0.1em] text-muted-foreground">
                {VIEW_TITLE[view]}
              </span>
            </>
          )}
        </span>

        {view !== 'home' && (
          <button
            type="button"
            onClick={() => setView('home')}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
          >
            <Icon name="ArrowLeft" size={14} className="text-accent" />
            К обзору
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
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
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-destructive hover:text-destructive"
          >
            <Icon name="LogOut" size={14} />
            Выйти
          </button>
        </div>
      </div>

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

          <div className="grid min-h-0 gap-3.5 lg:grid-cols-2">
            {objectsPanel}
            <Timesheet />
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

      {view === 'objects' && <div className="flex min-h-0 flex-1 flex-col">{objectsPanel}</div>}

      {view === 'timesheet' && (
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Timesheet />
        </div>
      )}

      {view === 'defects' && (
        <Panel title="Замечания по всем объектам" note={`${allDefects.length}`}>
          {defectsLoading ? (
            <Empty icon="Loader2" title="Загрузка…" hint="Собираем замечания со всех объектов." />
          ) : allDefects.length === 0 ? (
            <Empty
              icon="TriangleAlert"
              title="Замечаний нет"
              hint="Замечания появятся после выездов на объект."
            />
          ) : (
            allDefects.map((d) => (
              <Row
                key={d.id}
                title={d.title}
                sub={[
                  objects.find((o) => o.id === d.objectId)?.title ?? 'Объект',
                  `акт № ${d.inspNumber}`,
                  d.normRef || 'норма не указана',
                ].join(' · ')}
                right={
                  <Tag tone={d.severity === 'critical' ? 'hot' : d.severity === 'minor' ? 'dim' : 'wait'}>
                    {d.deadline || SEVERITY[d.severity || 'normal'].label}
                  </Tag>
                }
              />
            ))
          )}
        </Panel>
      )}

      {view === 'ordersAll' && (
        <Panel title="Предписания по всем объектам" note={`${allOrders.length}`}>
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