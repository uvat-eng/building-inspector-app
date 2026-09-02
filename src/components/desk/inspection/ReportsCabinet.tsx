import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { ProjectObject } from '@/data/store';
import { usePersistedState } from '@/hooks/usePersistedState';

interface ReportsCabinetProps {
  object: ProjectObject;
  onBack: () => void;
}

type View = 'root' | 'daily' | 'daily-new' | 'daily-log';

const ReportsCabinet = ({ object, onBack }: ReportsCabinetProps) => {
  const [view, setView] = usePersistedState<View>(`gsi-reports-view-${object.id}`, 'root');

  const back = () => {
    if (view === 'daily-new' || view === 'daily-log') setView('daily');
    else if (view === 'daily') setView('root');
    else onBack();
  };

  const backLabel =
    view === 'root' ? 'К меню объекта' : view === 'daily' ? 'К отчётам' : 'К ежедневным отчётам';

  const subtitle =
    view === 'root'
      ? 'Отчётные формы инспектора по объекту'
      : view === 'daily'
        ? 'Ежедневные отчёты — создание и сквозной журнал'
        : view === 'daily-new'
          ? 'Новый ежедневный отчёт'
          : 'Сквозной журнал ежедневных отчётов';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={back}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        {backLabel}
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">Отчёты</p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {object.title}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">{subtitle}</p>
        </section>

        {view === 'root' && (
          <Panel title="Отчётные формы" note="1">
            <button
              type="button"
              onClick={() => setView('daily')}
              className="group flex w-full items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors hover:bg-foreground hover:text-background"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name="CalendarDays" fallback="Folder" size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[0.98em] uppercase tracking-[0.03em]">
                  Ежедневные отчёты
                </span>
                <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                  Создание отчёта и сквозной журнал
                </span>
              </span>
              <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
            </button>
          </Panel>
        )}

        {view === 'daily' && (
          <Panel title="Ежедневные отчёты" note="2">
            <div className="grid gap-px bg-border sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setView('daily-new')}
                className="group flex items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors hover:bg-foreground hover:text-background"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                  <Icon name="FilePlus2" fallback="FilePlus" size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-head text-[0.98em] uppercase tracking-[0.03em]">
                    Создать новый ежедневный отчёт
                  </span>
                  <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                    Заполнение формы за смену
                  </span>
                </span>
                <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
              </button>

              <button
                type="button"
                onClick={() => setView('daily-log')}
                className="group flex items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors hover:bg-foreground hover:text-background"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                  <Icon name="BookOpen" fallback="Book" size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-head text-[0.98em] uppercase tracking-[0.03em]">
                    Сквозной журнал
                  </span>
                  <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                    Все отчёты по объекту подряд
                  </span>
                </span>
                <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
              </button>
            </div>
          </Panel>
        )}

        {view === 'daily-new' && (
          <Panel title="Новый ежедневный отчёт">
            <Empty
              icon="FilePlus2"
              title="Форма готовится"
              hint="Пришлите бланк ежедневного отчёта — соберу поля один в один."
            />
          </Panel>
        )}

        {view === 'daily-log' && (
          <Panel title="Сквозной журнал" note="0">
            <Empty
              icon="BookOpen"
              title="Записей пока нет"
              hint="Здесь появятся все ежедневные отчёты по объекту."
            />
          </Panel>
        )}
      </div>
    </div>
  );
};

export default ReportsCabinet;
