import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useObjects } from '@/data/store';
import { useOrders, Order } from '@/data/orders';
import { useAllInspections, useAllDefects, DefectRow } from '@/data/inspections';
import { JournalEntry } from '@/data/journal';

type Source = 'inspection' | 'order';

interface JournalImportDialogProps {
  open: boolean;
  inspector: string;
  existingSourceIds: Set<string>;
  onClose: () => void;
  onImport: (rows: Partial<JournalEntry>[]) => Promise<void>;
}

const CATEGORY_HINTS: [RegExp, string][] = [
  [/каск|страхов|огражд|охран[аы] труд|от и тб|спецодежд|лестниц|высот/i, 'ОТ'],
  [/аоср|исполнительн|журнал|ид\b|птд|сертификат|паспорт/i, 'ИД, ОТД'],
  [/сварщик|аттестац|нaks|наks/i, 'Аттестация сварщиков'],
  [/геодез|нивелир|высотн|разбивк|тахеометр/i, 'Геодезические'],
  [/сварк|сварн|шов|шва|стык|провар/i, 'Сварочно-монтажные работы'],
  [/кабел|электро|заземл|щит|эмр|провод/i, 'ЭМР'],
  [/мусор|склад|хранени|захламл|чистот/i, 'Складирование, мусор'],
];

const guessCategory = (text: string) => {
  const hit = CATEGORY_HINTS.find(([re]) => re.test(text));
  return hit ? hit[1] : '';
};

const toIso = (v?: string) => {
  if (!v) return '';
  const m = v.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const JournalImportDialog = ({
  open,
  inspector,
  existingSourceIds,
  onClose,
  onImport,
}: JournalImportDialogProps) => {
  const { toast } = useToast();
  const { list: objects } = useObjects();
  const { items: inspections } = useAllInspections();
  const { items: defects } = useAllDefects();
  const { items: orders } = useOrders();

  const [source, setSource] = useState<Source>('inspection');
  const [docId, setDocId] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSource('inspection');
    setDocId('');
    setPicked(new Set());
  }, [open]);

  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? 'Объект';

  const docs = useMemo(() => {
    if (source === 'inspection')
      return inspections.map((i) => ({
        id: i.id,
        title: `Акт проверки № ${i.number}`,
        note: `${objTitle(i.objectId)} · ${i.workType || 'без вида работ'} · ${
          defects.filter((d) => d.inspectionId === i.id).length
        } замечаний`,
        count: defects.filter((d) => d.inspectionId === i.id).length,
      }));
    return orders.map((o) => ({
      id: o.id,
      title: `Предписание № ${o.number}`,
      note: `${objTitle(o.objectId)} · ${o.issuedTo || '—'} · ${
        (o.body.items ?? []).length
      } пунктов`,
      count: (o.body.items ?? []).length,
    }));
  }, [source, inspections, orders, defects, objects]);

  interface Row {
    key: string;
    content: string;
    normRef: string;
    already: boolean;
    build: () => Partial<JournalEntry>;
  }

  const rows = useMemo<Row[]>(() => {
    if (!docId) return [];

    if (source === 'inspection') {
      const insp = inspections.find((i) => i.id === docId);
      if (!insp) return [];
      return defects
        .filter((d) => d.inspectionId === docId)
        .map((d: DefectRow) => ({
          key: d.id,
          content: d.title,
          normRef: d.normRef,
          already: existingSourceIds.has(d.id),
          build: () => ({
            date: toIso(d.inspDate) || new Date().toISOString().slice(0, 10),
            objectTitle: d.place || objTitle(insp.objectId),
            contractor: d.contractor || insp.subcontractor || insp.generalContractor || '',
            content: [d.title, d.normRef].filter(Boolean).join('\n'),
            recordedBy: `Инженер СК ${insp.inspector || inspector}`,
            ackBy: d.ackBy || insp.contractorRep || '',
            measures: d.measures || '',
            fixStatus: d.fixStatus || 'не устранено',
            fixDate: toIso(d.fixDate),
            responsibility: d.responsibility || 'вопрос подрядчика',
            orderNote: d.extendNote || `Акт проверки № ${insp.number}`,
            category: d.category || guessCategory(`${d.title} ${d.normRef}`),
            authorId: inspector,
            authorFio: inspector,
            sourceKind: 'inspection',
            sourceId: d.id,
            sourceNumber: insp.number,
          }),
        }));
    }

    const order = orders.find((o) => o.id === docId) as Order | undefined;
    if (!order) return [];
    return (order.body.items ?? []).map((it, idx) => {
      const key = `${order.id}-${it.pos ?? idx + 1}`;
      return {
        key,
        content: it.title ?? '',
        normRef: it.normRef ?? '',
        already: existingSourceIds.has(key),
        build: () => ({
          date: toIso(order.createdAt) || new Date().toISOString().slice(0, 10),
          objectTitle: objTitle(order.objectId),
          contractor: order.issuedTo || '',
          content: [it.title, it.normRef].filter(Boolean).join('\n'),
          recordedBy: `Инженер СК ${order.inspector || inspector}`,
          ackBy: '',
          measures: '',
          fixStatus: order.status === 'done' ? 'устранено' : 'не устранено',
          fixDate: toIso(order.fixDate),
          responsibility: 'вопрос подрядчика',
          orderNote: `Предписание № ${order.number}${
            order.deadline ? `, срок ${order.deadline}` : ''
          }`,
          category: order.category || guessCategory(`${it.title} ${it.normRef ?? ''}`),
          authorId: inspector,
          authorFio: inspector,
          sourceKind: 'order',
          sourceId: key,
          sourceNumber: order.number,
        }),
      };
    });
  }, [docId, source, inspections, defects, orders, objects, inspector, existingSourceIds]);

  const fresh = rows.filter((r) => !r.already);

  const toggle = (key: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const run = async () => {
    const list = rows.filter((r) => picked.has(r.key)).map((r) => r.build());
    if (list.length === 0) {
      toast({ title: 'Отметьте замечания для переноса', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await onImport(list);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
            Подгрузить замечания
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Выберите источник, документ и нужные пункты — они станут записями журнала.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin flex max-h-[62vh] flex-col gap-3 overflow-y-auto pr-1">
          <div>
            <p className="mb-1.5 text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Шаг 1 · откуда берём
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['inspection', 'Акты проверок', 'TriangleAlert', inspections.length],
                  ['order', 'Предписания', 'FileWarning', orders.length],
                ] as const
              ).map(([id, label, icon, n]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSource(id);
                    setDocId('');
                    setPicked(new Set());
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-sm border px-3 py-2.5 text-left transition-colors',
                    source === id
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent hover:bg-secondary/60',
                  )}
                >
                  <Icon name={icon} size={17} className="flex-none text-accent" />
                  <span className="min-w-0">
                    <span className="block truncate font-head text-[0.86em] uppercase tracking-[0.03em]">
                      {label}
                    </span>
                    <span className="block text-[0.74em] text-muted-foreground">
                      {n} документов
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Шаг 2 · из какого документа
            </p>
            <div className="max-h-52 overflow-y-auto rounded-sm border border-border">
              {docs.length === 0 ? (
                <p className="px-3 py-4 text-[0.82em] text-muted-foreground">
                  Документов пока нет.
                </p>
              ) : (
                docs.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDocId(d.id);
                      setPicked(new Set());
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0',
                      docId === d.id ? 'bg-accent/10' : 'hover:bg-secondary/60',
                    )}
                  >
                    <Icon
                      name={docId === d.id ? 'CircleDot' : 'Circle'}
                      size={15}
                      className={cn('flex-none', docId === d.id ? 'text-accent' : 'text-muted-foreground/50')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.88em]">{d.title}</span>
                      <span className="block truncate text-[0.74em] text-muted-foreground">
                        {d.note}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {docId && (
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <p className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                  Шаг 3 · какие замечания
                </p>
                {fresh.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPicked(
                        picked.size === fresh.length
                          ? new Set()
                          : new Set(fresh.map((r) => r.key)),
                      )
                    }
                    className="ml-auto text-[0.76em] text-accent hover:underline"
                  >
                    {picked.size === fresh.length ? 'Снять всё' : 'Выбрать все'}
                  </button>
                )}
              </div>

              <div className="rounded-sm border border-border">
                {rows.length === 0 ? (
                  <p className="px-3 py-4 text-[0.82em] text-muted-foreground">
                    В документе нет пунктов.
                  </p>
                ) : (
                  rows.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      disabled={r.already}
                      onClick={() => toggle(r.key)}
                      className={cn(
                        'flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0',
                        r.already
                          ? 'cursor-not-allowed opacity-50'
                          : picked.has(r.key)
                            ? 'bg-accent/10'
                            : 'hover:bg-secondary/60',
                      )}
                    >
                      <Icon
                        name={
                          r.already ? 'CircleCheck' : picked.has(r.key) ? 'SquareCheck' : 'Square'
                        }
                        size={16}
                        className={cn(
                          'mt-0.5 flex-none',
                          picked.has(r.key) || r.already
                            ? 'text-accent'
                            : 'text-muted-foreground/50',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.86em] leading-snug">{r.content}</span>
                        {r.normRef && (
                          <span className="mt-0.5 block truncate text-[0.74em] text-muted-foreground">
                            {r.normRef}
                          </span>
                        )}
                        {r.already && (
                          <span className="mt-0.5 block text-[0.74em] text-accent">
                            уже в журнале
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-sm" onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={busy || picked.size === 0}
            onClick={run}
            className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy ? 'Loader2' : 'Download'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            Подгрузить {picked.size > 0 ? `· ${picked.size}` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JournalImportDialog;
