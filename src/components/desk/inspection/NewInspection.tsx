import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { WORK_TYPES, DOC_SECTIONS } from '@/data/inspections';

interface NewInspectionProps {
  objectTitle: string;
  inspector: string;
  contractorName?: string;
  busy?: boolean;
  onBack: () => void;
  onCreate: (data: {
    workType: string;
    docRef: string;
    contractorRep: string;
    inspector: string;
  }) => void;
}

const NewInspection = ({
  objectTitle,
  inspector,
  contractorName,
  busy,
  onBack,
  onCreate,
}: NewInspectionProps) => {
  const { toast } = useToast();
  const [workType, setWorkType] = useState('');
  const [customWork, setCustomWork] = useState('');
  const [docRef, setDocRef] = useState('');
  const [rep, setRep] = useState('');

  const submit = () => {
    const wt = workType === '__other' ? customWork.trim() : workType;
    if (!wt) {
      toast({ title: 'Выберите вид контролируемых работ', variant: 'destructive' });
      return;
    }
    if (!rep.trim()) {
      toast({ title: 'Укажите представителя подрядчика', variant: 'destructive' });
      return;
    }
    onCreate({ workType: wt, docRef, contractorRep: rep.trim(), inspector });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        К проверкам
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Новый осмотр
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {objectTitle}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            Инспектор: {inspector || 'не указан'}
            {contractorName ? ` · Подрядчик: ${contractorName}` : ''}
          </p>
        </section>

        <Panel title="Параметры осмотра" note="шаг 1 из 2">
          <div className="space-y-4 px-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Вид контролируемых работ
              </Label>
              <div className="grid gap-px bg-border sm:grid-cols-2">
                {WORK_TYPES.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWorkType(w)}
                    className={cn(
                      'px-3 py-2.5 text-left text-[0.84em] transition-colors',
                      workType === w
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-card hover:bg-secondary',
                    )}
                  >
                    {w}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setWorkType('__other')}
                  className={cn(
                    'px-3 py-2.5 text-left text-[0.84em] transition-colors',
                    workType === '__other'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card hover:bg-secondary',
                  )}
                >
                  Другой вид работ
                </button>
              </div>
              {workType === '__other' && (
                <Input
                  value={customWork}
                  onChange={(e) => setCustomWork(e.target.value)}
                  placeholder="Укажите вид работ"
                  className="mt-2 h-9 rounded-sm"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Привязка к разделу проекта
              </Label>
              <div className="grid gap-px bg-border sm:grid-cols-2">
                {DOC_SECTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDocRef(docRef === d ? '' : d)}
                    className={cn(
                      'px-3 py-2.5 text-left text-[0.84em] transition-colors',
                      docRef === d
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-card hover:bg-secondary',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                ФИО представителя подрядчика
              </Label>
              <Input
                value={rep}
                onChange={(e) => setRep(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="h-9 rounded-sm"
              />
            </div>

            <Button
              onClick={submit}
              disabled={busy}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'ClipboardCheck'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              Сформировать акт осмотра
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default NewInspection;
