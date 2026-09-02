import Topbar from '@/components/desk/Topbar';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { MODULES, ModuleId } from '@/data/modules';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onPick: (id: ModuleId) => void;
  onAdmin?: () => void;
}

const ModulePicker = ({ onPick, onAdmin }: Props) => {
  const { toast } = useToast();

  const choose = (id: ModuleId, ready: boolean) => {
    if (!ready) {
      toast({
        title: 'Модуль в разработке',
        description: 'Пока доступен модуль строительного контроля.',
      });
      return;
    }
    onPick(id);
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <Topbar />

      <main className="scrollbar-thin flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:px-6">
        <div className="w-full max-w-3xl animate-rise">
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name="Building2" size={24} />
            </span>
            <h1 className="mt-4 font-head text-[22px] uppercase leading-[1.1] tracking-[0.02em] sm:text-[30px]">
              Приложение <span className="text-accent">Инспектор</span>
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[0.88em] text-muted-foreground">
              Выберите, с какой стороны вы участвуете в проекте — откроется свой рабочий модуль
            </p>
          </div>

          <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => choose(m.id, m.ready)}
                className={cn(
                  'group flex items-start gap-3 rounded-sm border bg-card p-4 text-left transition-all',
                  m.ready
                    ? 'border-border hover:-translate-y-0.5 hover:border-accent hover:shadow-lg'
                    : 'border-border/70 opacity-70 hover:opacity-100',
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 flex-none items-center justify-center rounded-sm transition-colors',
                    m.ready
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-muted-foreground',
                  )}
                >
                  <Icon name={m.icon} size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-head text-[1.05em] uppercase tracking-[0.03em]">
                      {m.title}
                    </span>
                    {!m.ready && (
                      <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.62em] uppercase tracking-[0.08em] text-muted-foreground">
                        скоро
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[0.8em] leading-snug text-muted-foreground">
                    {m.note}
                  </span>
                </span>
                {m.ready && (
                  <Icon
                    name="ArrowRight"
                    size={17}
                    className="mt-1 flex-none text-muted-foreground transition-colors group-hover:text-accent"
                  />
                )}
              </button>
            ))}
          </div>

          {onAdmin && (
            <button
              type="button"
              onClick={onAdmin}
              className="group mt-2.5 flex w-full items-center gap-3 rounded-sm border border-dashed border-border bg-secondary/30 p-4 text-left transition-all hover:border-accent hover:bg-secondary/60"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-foreground text-background">
                <Icon name="ShieldUser" fallback="Shield" size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[1.05em] uppercase tracking-[0.03em]">
                  Администратор
                </span>
                <span className="mt-1 block text-[0.8em] leading-snug text-muted-foreground">
                  Полный доступ ко всем модулям, локациям и учётным записям
                </span>
              </span>
              <Icon
                name="ArrowRight"
                size={17}
                className="mt-1 flex-none text-muted-foreground transition-colors group-hover:text-accent"
              />
            </button>
          )}

          <p className="mt-6 text-center text-[0.76em] text-muted-foreground">
            ООО «Глобал-Стройинжиниринг» · Тюмень
          </p>

          <div className="mt-4 flex justify-center pb-2">
            <img
              src="/logo.png"
              alt="ООО «Глобал-Стройинжиниринг»"
              className="h-14 w-auto object-contain opacity-90"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ModulePicker;