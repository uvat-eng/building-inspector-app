import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { OBJECTS, INSPECTIONS, DEFECTS, DOCS, SiteObject } from '@/data/mock';

const ObjectsSection = () => {
  const [open, setOpen] = useState<SiteObject | null>(null);

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-2 lg:grid-rows-2">
        <Panel title="Объекты строительства" note="12">
          {OBJECTS.map((o) => (
            <Row
              key={o.id}
              title={o.title}
              sub={o.sub}
              unread={o.unread}
              onClick={() => setOpen(o)}
              right={<Tag tone={o.tone}>{o.tag}</Tag>}
            />
          ))}
        </Panel>

        <Panel title="Проверки и выезды" note="сегодня 4">
          {INSPECTIONS.filter((i) => i.status === 'today').map((i, idx) => (
            <Row
              key={i.id}
              title={i.title}
              sub={i.sub}
              unread={idx === 0}
              right={
                <span className="flex-none text-[0.8em] tracking-[0.03em] text-muted-foreground">
                  {i.time}
                </span>
              }
            />
          ))}
        </Panel>

        <Panel title="Замечания и дефекты" note="открыто 31">
          {DEFECTS.map((d) => (
            <Row
              key={d.id}
              title={d.title}
              sub={d.sub}
              unread={d.unread}
              right={<Tag tone={d.tone}>{d.tag}</Tag>}
            />
          ))}
        </Panel>

        <Panel title="Акты, документы, фото" note="на подпись 5">
          {DOCS.map((d) => (
            <Row
              key={d.id}
              title={d.title}
              sub={d.sub}
              unread={d.unread}
              right={<Tag tone={d.tone}>{d.tag}</Tag>}
            />
          ))}
        </Panel>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg rounded-sm border-t-2 border-t-accent">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-head text-xl uppercase tracking-[0.04em]">
                  {open.title}
                </DialogTitle>
                <DialogDescription>
                  {open.region} · {open.customer}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['Этап', open.sub],
                  ['Срок по договору', open.deadline],
                  ['Инспектор', open.inspector],
                  ['Открытых замечаний', String(open.openDefects)],
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
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="flex items-center gap-2 rounded-sm bg-secondary px-3 py-2 text-[0.8em] uppercase tracking-[0.08em]">
                  <Icon name="MapPin" size={14} className="text-accent" /> Журнал выездов
                </span>
                <span className="flex items-center gap-2 rounded-sm bg-secondary px-3 py-2 text-[0.8em] uppercase tracking-[0.08em]">
                  <Icon name="FileText" size={14} className="text-accent" /> Исполнительная
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ObjectsSection;
