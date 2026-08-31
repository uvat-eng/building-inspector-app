import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import Timesheet from '@/components/desk/Timesheet';
import { useObjects } from '@/data/store';
import { DEFECTS, PHOTOS } from '@/data/mock';
import { useTimesheet, monthEntries, dayHours, fmtHours } from '@/data/timesheet';

const InspectorCabinet = () => {
  const { profile } = useProfile();
  const { list: objects } = useObjects();
  const { sheet } = useTimesheet();
  const spec = profile.specialties ?? [];

  const now = new Date();
  const month = monthEntries(sheet, now.getFullYear(), now.getMonth());
  const monthHours = month.reduce((s, [, list]) => s + dayHours(list), 0);

  const stats = [
    { icon: 'Building2', label: 'Объектов', value: objects.length },
    { icon: 'Clock', label: 'Часов за месяц', value: fmtHours(monthHours) },
    { icon: 'TriangleAlert', label: 'Замечаний', value: DEFECTS.length },
    { icon: 'Camera', label: 'Фотоотчётов', value: PHOTOS.length },
  ];

  return (
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
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-sm border border-border bg-card px-4 py-3.5"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name={s.icon} fallback="Circle" size={19} />
            </span>
            <span>
              <span className="block font-head text-[1.5em] leading-none">{s.value}</span>
              <span className="block text-[0.78em] uppercase tracking-[0.1em] text-muted-foreground">
                {s.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid min-h-0 gap-3.5 lg:grid-cols-2">
        <Panel title="Мои объекты" note={`${objects.length}`}>
          {objects.length === 0 ? (
            <Empty icon="Building2" title="Объекты не назначены" hint="Обратитесь к руководителю проекта." />
          ) : (
            objects
              .slice(0, 8)
              .map((o) => <Row key={o.id} title={o.title} sub={`${o.regionName} · ${o.stage}`} />)
          )}
        </Panel>

        <Timesheet />
      </div>
    </div>
  );
};

export default InspectorCabinet;