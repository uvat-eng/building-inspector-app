import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import Timesheet from '@/components/desk/Timesheet';
import { useObjects } from '@/data/store';
import { DEFECTS, PHOTOS } from '@/data/mock';
import { useTimesheet, monthEntries, dayHours, fmtHours } from '@/data/timesheet';
import { cn } from '@/lib/utils';

type View = 'home' | 'objects' | 'timesheet' | 'defects' | 'photos';

const VIEW_TITLE: Record<View, string> = {
  home: 'Обзор',
  objects: 'Мои объекты',
  timesheet: 'Табель учёта времени',
  defects: 'Мои замечания',
  photos: 'Мои фотоотчёты',
};

interface InspectorCabinetProps {
  onExit?: () => void;
}

const InspectorCabinet = ({ onExit }: InspectorCabinetProps) => {
  const [view, setView] = useState<View>('home');
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { sheet } = useTimesheet();
  const spec = profile.specialties ?? [];

  const now = new Date();
  const month = monthEntries(sheet, now.getFullYear(), now.getMonth());
  const monthHours = month.reduce((s, [, list]) => s + dayHours(list), 0);

  const stats: { icon: string; label: string; value: string | number; view: View }[] = [
    { icon: 'Building2', label: 'Объектов', value: objects.length, view: 'objects' },
    {
      icon: 'Clock',
      label: `Табель · ${month.length} смен`,
      value: `${fmtHours(monthHours)} ч`,
      view: 'timesheet',
    },
    { icon: 'TriangleAlert', label: 'Замечаний', value: DEFECTS.length, view: 'defects' },
    { icon: 'Camera', label: 'Фотоотчётов', value: PHOTOS.length, view: 'photos' },
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
          <Row key={o.id} title={o.title} sub={`${o.regionName} · ${o.stage}`} />
        ))
      )}
    </Panel>
  );

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

        <button
          type="button"
          onClick={onExit}
          className="ml-auto flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-destructive hover:text-destructive"
        >
          <Icon name="LogOut" size={14} />
          Выйти из кабинета
        </button>
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

      {view === 'objects' && <div className="flex min-h-0 flex-1 flex-col">{objectsPanel}</div>}

      {view === 'timesheet' && (
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Timesheet />
        </div>
      )}

      {view === 'defects' && (
        <Panel title="Мои замечания" note={`${DEFECTS.length}`}>
          {DEFECTS.length === 0 ? (
            <Empty
              icon="TriangleAlert"
              title="Замечаний нет"
              hint="Замечания появятся после выездов на объект."
            />
          ) : (
            DEFECTS.map((d) => (
              <Row key={d.id} title={d.title} sub={d.sub} right={<Tag tone={d.tone}>{d.tag}</Tag>} />
            ))
          )}
        </Panel>
      )}

      {view === 'photos' && (
        <Panel title="Мои фотоотчёты" note={`${PHOTOS.length}`}>
          {PHOTOS.length === 0 ? (
            <Empty
              icon="Camera"
              title="Фотоотчётов нет"
              hint="Снимки с объектов появятся здесь."
            />
          ) : (
            PHOTOS.map((p) => <Row key={p.id} title={p.title} sub={p.meta} />)
          )}
        </Panel>
      )}
    </div>
  );
};

export default InspectorCabinet;