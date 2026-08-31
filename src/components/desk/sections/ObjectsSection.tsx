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
import type { TagTone } from '@/data/mock';

const TONE: Record<ProjectObject['status'], TagTone> = {
  work: 'hot',
  plan: 'wait',
  done: 'ok',
  risk: 'hot',
};

const ObjectsSection = () => {
  const { list, add, remove } = useObjects();
  const [open, setOpen] = useState<ProjectObject | null>(null);
  const [form, setForm] = useState(false);

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-0.5">
      <Panel title="Карта объектов России" note="упор на Якутию" className="flex-none">
        <RussiaMap objects={list} onPick={setOpen} />
      </Panel>

      <Panel title="Сводная информация" note="суммируется по всем объектам" className="flex-none">
        <Summary objects={list} />
      </Panel>

      <Panel
        title="Объекты строительства"
        note={`${list.length}`}
        className="flex-none"
        action={
          <Button
            size="sm"
            onClick={() => setForm(true)}
            className="ml-3 h-8 gap-1.5 rounded-sm bg-accent px-3 font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="Plus" size={14} />
            Добавить объект
          </Button>
        }
      >
        {list.length === 0 ? (
          <Empty
            icon="Building2"
            title="Объектов пока нет"
            hint="Нажмите «Добавить объект»: заказчик, договор, точка на карте, ресурсы."
          />
        ) : (
          list.map((o) => (
            <Row
              key={o.id}
              title={o.title}
              sub={`${o.regionName} · ${o.customer} · ${o.stage} · готовность ${o.progress}%`}
              onClick={() => setOpen(o)}
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
              <div className="flex justify-between pt-1">
                <span className="flex items-center gap-2 rounded-sm bg-secondary px-3 py-2 text-[0.8em] uppercase tracking-[0.08em]">
                  <Icon name="MapPin" size={14} className="text-accent" /> {open.regionName}
                </span>
                <Button
                  variant="ghost"
                  className="rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    remove(open.id);
                    setOpen(null);
                  }}
                >
                  <Icon name="Trash2" size={15} className="mr-1.5" />
                  Удалить
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ObjectsSection;
