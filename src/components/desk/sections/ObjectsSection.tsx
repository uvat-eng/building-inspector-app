import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import Empty from '@/components/desk/Empty';
import RussiaMap from '@/components/desk/RussiaMap';
import Summary from '@/components/desk/Summary';
import ObjectForm from '@/components/desk/ObjectForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useObjects, money, ProjectObject, STATUS_LABEL } from '@/data/store';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import { useToast } from '@/hooks/use-toast';
import type { TagTone } from '@/data/mock';

const TONE: Record<ProjectObject['status'], TagTone> = {
  work: 'hot',
  plan: 'wait',
  done: 'ok',
  risk: 'hot',
};

interface ObjectsSectionProps {
  onOpenObject?: (id: string, edit?: boolean) => void;
}

const ObjectsSection = ({ onOpenObject }: ObjectsSectionProps) => {
  const { list, add } = useObjects();
  const { profile, canAddObject } = useProfile();
  const { toast } = useToast();
  const [open, setOpen] = useState<ProjectObject | null>(null);
  const [form, setForm] = useState(false);

  const tryAdd = () => {
    if (!canAddObject) {
      toast({
        title: 'Недостаточно прав',
        description: `Добавлять объекты могут директор, координатор и руководитель проекта. Ваша роль: ${ROLE_LABEL[profile.role]}.`,
        variant: 'destructive',
      });
      return;
    }
    setForm(true);
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-0.5">
      <div className="flex-none rounded-sm border border-border border-l-2 border-l-accent bg-card px-4 py-3 font-head text-[0.95em] uppercase leading-snug tracking-[0.04em]">
        Хорошая работа — хорошая зарплата. Плохая работа — <span className="text-accent">нет зарплаты, совсем</span>.
      </div>

      <Panel title="Карта объектов России" className="flex-none">
        <RussiaMap objects={list} onPick={(o) => setOpen(o)} />
      </Panel>

      <Panel title="Сводная информация" note="суммируется по всем объектам" className="flex-none">
        <Summary objects={list} />
      </Panel>

      <Panel
        title="Объекты строительства"
        note={`${list.length} · сгруппированы в разделе «Объекты»`}
        className="flex-none"
        action={
          <Button
            size="sm"
            onClick={tryAdd}
            title={canAddObject ? undefined : 'Доступно директору, координатору и руководителю проекта'}
            className={`ml-3 h-8 gap-1.5 rounded-sm px-3 font-head text-[0.85em] uppercase tracking-[0.06em] ${
              canAddObject
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-secondary text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Icon name={canAddObject ? 'Plus' : 'Lock'} size={14} />
            Добавить объект
          </Button>
        }
      >
        {list.length === 0 ? (
          <Empty
            icon="Building2"
            title="Объектов пока нет"
            hint={
              canAddObject
                ? 'Нажмите «Добавить объект»: заказчик, договор, точка на карте, ресурсы.'
                : 'Объекты добавляют директор, координатор и руководитель проекта.'
            }
          />
        ) : (
          list.map((o) => (
            <Row
              key={o.id}
              title={o.title}
              sub={`${o.regionName} · ${o.customer} · ${o.stage} · готовность ${o.progress}%`}
              onClick={() => onOpenObject?.(o.id)}
              right={<Tag tone={TONE[o.status]}>{STATUS_LABEL[o.status]}</Tag>}
            />
          ))
        )}
      </Panel>

      <ObjectForm open={form} onOpenChange={setForm} onSave={add} />

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg rounded-sm border-t-2 border-t-accent">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-xl uppercase tracking-[0.04em]">
                  {open.title}
                </DialogTitle>
                <DialogDescription>
                  {open.regionName} · {open.customer}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['Договор', open.contractNo || '—'],
                  ['Сумма договора', money(open.contractSum)],
                  ['Этап', open.stage],
                  ['Статус', STATUS_LABEL[open.status]],
                  ['Начало работ', open.start || '—'],
                  ['Срок по договору', open.deadline || '—'],
                  ['Персонал план/факт', `${open.staffPlan} / ${open.staffFact}`],
                  ['Техника план/факт', `${open.techPlan} / ${open.techFact}`],
                  ['Предписаний выдано', String(open.orders)],
                  ['Не устранено', String(open.ordersOpen)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
                      {k}
                    </dt>
                    <dd className="mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
                  <span>Готовность</span>
                  <span className="text-accent">{open.progress}%</span>
                </div>
                <div className="h-2 w-full rounded-sm bg-secondary">
                  <div
                    className="h-2 rounded-sm bg-accent transition-all duration-700"
                    style={{ width: `${open.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="flex items-center gap-2 rounded-sm bg-secondary px-3 py-2 text-[0.8em] uppercase tracking-[0.08em]">
                  <Icon name="MapPin" size={14} className="text-accent" /> {open.regionName}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-sm"
                    onClick={() => {
                      onOpenObject?.(open.id);
                      setOpen(null);
                    }}
                  >
                    <Icon name="ExternalLink" size={15} className="mr-1.5" />
                    Открыть объект
                  </Button>
                  <Button
                    className={`rounded-sm font-head uppercase tracking-[0.06em] ${
                      canAddObject
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary'
                    }`}
                    onClick={() => {
                      if (!canAddObject) {
                        toast({
                          title: 'Недостаточно прав',
                          description: `Корректировать объект могут директор, координатор и руководитель проекта. Ваша роль: ${ROLE_LABEL[profile.role]}.`,
                          variant: 'destructive',
                        });
                        return;
                      }
                      onOpenObject?.(open.id, true);
                      setOpen(null);
                    }}
                  >
                    <Icon name={canAddObject ? 'Pencil' : 'Lock'} size={15} className="mr-1.5" />
                    Корректировать
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ObjectsSection;