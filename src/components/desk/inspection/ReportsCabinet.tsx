import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { ProjectObject } from '@/data/store';

interface ReportsCabinetProps {
  object: ProjectObject;
  onBack: () => void;
}

const ReportsCabinet = ({ object, onBack }: ReportsCabinetProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-2.5">
    <button
      type="button"
      onClick={onBack}
      className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
    >
      <Icon name="ArrowLeft" size={14} className="text-accent" />К меню объекта
    </button>

    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
        <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">Отчёты</p>
        <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
          {object.title}
        </h1>
        <p className="mt-1.5 text-[0.82em] text-muted-foreground">
          Отчётные формы инспектора по объекту
        </p>
      </section>

      <Panel title="Отчётные формы" note="0">
        <Empty
          icon="FileText"
          title="Форм пока нет"
          hint="Загрузите отчётные бланки — они появятся здесь."
        />
      </Panel>
    </div>
  </div>
);

export default ReportsCabinet;
