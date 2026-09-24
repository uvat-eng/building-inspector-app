import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { useObjects } from '@/data/store';
import { useAllInspections, updateInspection, Inspection } from '@/data/inspections';
import { useOrders, Order } from '@/data/orders';
import ActEditor from '@/components/desk/inspection/ActEditor';
import OrderQuickView from '@/components/desk/inspection/OrderQuickView';
import { orderPayload } from '@/lib/makeOrder';
import { useToast } from '@/hooks/use-toast';
import { useAllFolders, monthLabel } from '@/data/folders';
import { useAllSignedDocs, SECTION_META } from '@/data/signed';
import { useAllDocuments, SECTION_LABEL, fmtSize } from '@/data/documents';
import type { TagTone } from '@/data/mock';

type Kind = 'all' | 'act' | 'order' | 'project' | 'signed' | 'photo';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'act', label: 'Акты проверок' },
  { id: 'order', label: 'Предписания' },
  { id: 'project', label: 'Документация' },
  { id: 'signed', label: 'Подписанные' },
  { id: 'photo', label: 'Фотоотчёты' },
];

interface DocItem {
  id: string;
  kind: Exclude<Kind, 'all'>;
  title: string;
  sub: string;
  tag: string;
  tone: TagTone;
  url?: string;
  date: string;
  act?: Inspection;
  order?: Order;
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru');
};

const DocumentsSection = () => {
  const { toast } = useToast();
  const [kind, setKind] = useState<Kind>('all');
  const [openAct, setOpenAct] = useState<Inspection | null>(null);
  const [openOrder, setOpenOrder] = useState<Order | null>(null);

  const { list: objects } = useObjects();
  const { items: inspections, loading: l1 } = useAllInspections();
  const { items: orders, loading: l2, create: createOrder } = useOrders();
  const { items: folders, loading: l3 } = useAllFolders('photoreport');
  const { items: signed, loading: l4 } = useAllSignedDocs();
  const { items: projectDocs, loading: l5 } = useAllDocuments();

  const loading = l1 || l2 || l3 || l4 || l5;
  const objTitle = (id: string) => objects.find((o) => o.id === id)?.title ?? 'Объект';

  const all = useMemo<DocItem[]>(() => {
    const acts: DocItem[] = inspections.map((i) => ({
      id: `act-${i.id}`,
      kind: 'act',
      title: `Акт проверки № ${i.number || '—'}`,
      sub: [objTitle(i.objectId), i.workType, i.inspector].filter(Boolean).join(' · '),
      tag: i.status === 'done' ? 'Готов' : 'Черновик',
      tone: i.status === 'done' ? 'ok' : 'wait',
      url: i.actUrl,
      date: i.createdAt,
      act: i,
    }));

    const ords: DocItem[] = orders.map((o) => ({
      id: `ord-${o.id}`,
      kind: 'order',
      title: `Предписание № ${o.number || '—'}`,
      sub: [objTitle(o.objectId), o.issuedTo, o.deadline && `срок ${o.deadline}`]
        .filter(Boolean)
        .join(' · '),
      tag: o.status === 'done' ? 'Исполнено' : 'В работе',
      tone: o.status === 'done' ? 'ok' : 'hot',
      url: o.fileUrl,
      date: o.createdAt,
      order: o,
    }));

    const photos: DocItem[] = folders.map((f) => ({
      id: `ph-${f.id}`,
      kind: 'photo',
      title: f.meta?.place || f.title || 'Фотоотчёт',
      sub: [objTitle(f.objectId), monthLabel(f.month), f.createdBy].filter(Boolean).join(' · '),
      tag: `${f.photos.length} фото`,
      tone: 'dim',
      date: f.createdAt,
    }));

    const sign: DocItem[] = signed.map((d) => ({
      id: `sg-${d.id}`,
      kind: 'signed',
      title: d.title || d.fileName,
      sub: [objTitle(d.objectId), SECTION_META[d.section]?.label, d.period]
        .filter(Boolean)
        .join(' · '),
      tag: 'Подписан',
      tone: 'ok',
      url: d.fileUrl,
      date: d.createdAt,
    }));

    const proj: DocItem[] = projectDocs.map((d) => ({
      id: `pd-${d.id}`,
      kind: 'project',
      title: d.title || d.fileName,
      sub: [objTitle(d.objectId), SECTION_LABEL[d.section], fmtSize(d.fileSize)]
        .filter(Boolean)
        .join(' · '),
      tag: 'Документация',
      tone: 'dim',
      url: d.fileUrl,
      date: d.createdAt,
    }));

    return [...acts, ...ords, ...sign, ...proj, ...photos].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }, [inspections, orders, folders, signed, projectDocs, objects]);

  const list = kind === 'all' ? all : all.filter((d) => d.kind === kind);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: all.length };
    all.forEach((d) => {
      map[d.kind] = (map[d.kind] ?? 0) + 1;
    });
    return map;
  }, [all]);

  const makeOrder = async (insp: Inspection) => {
    try {
      const { data } = await orderPayload(
        insp,
        objTitle(insp.objectId),
        insp.inspector || '',
        '',
        objects.find((o) => o.id === insp.objectId) ?? null,
      );
      const order = await createOrder(data);
      setOpenAct(null);
      setOpenOrder(order);
      toast({ title: `Предписание № ${order.number} создано`, description: 'Открываем' });
    } catch {
      toast({ title: 'Не удалось оформить предписание', variant: 'destructive' });
    }
  };

  if (openAct) {
    return (
      <ActEditor
        inspection={openAct}
        objectTitle={objTitle(openAct.objectId)}
        onBack={() => setOpenAct(null)}
        onFinish={(i) => updateInspection(i.id, { status: 'done' })}
        onOrder={(i) => makeOrder(i)}
      />
    );
  }

  if (openOrder) {
    return <OrderQuickView order={openOrder} onBack={() => setOpenOrder(null)} />;
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-[1.4fr_1fr]">
      <Panel
        title="Акты и документы"
        note={`${list.length}`}
        action={
          <span className="ml-3 flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`rounded-sm px-2 py-1 text-[0.85em] tracking-[0.04em] transition-colors ${
                  kind === k.id
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-border'
                }`}
              >
                {k.label}
                {counts[k.id] ? ` ${counts[k.id]}` : ''}
              </button>
            ))}
          </span>
        }
      >
        {loading ? (
          <p className="flex items-center gap-2 p-4 text-[0.9em] text-muted-foreground">
            <Icon name="Loader2" size={15} className="animate-spin" />
            Собираем документы по всем разделам…
          </p>
        ) : list.length === 0 ? (
          <Empty
            icon="FileText"
            title="В этой категории пока пусто"
            hint="Здесь собираются акты проверок, предписания, документация, подписанные файлы и фотоотчёты."
          />
        ) : (
          list.map((d) => (
            <Row
              key={d.id}
              title={d.title}
              sub={`${fmt(d.date)} · ${d.sub}`}
              onClick={
                d.act
                  ? () => setOpenAct(d.act ?? null)
                  : d.order
                    ? () => setOpenOrder(d.order ?? null)
                    : d.url
                      ? () => window.open(d.url, '_blank')
                      : undefined
              }
              right={<Tag tone={d.tone}>{d.tag}</Tag>}
            />
          ))
        )}
      </Panel>

      <Panel title="Документооборот" note="как это работает">
        <ul className="space-y-3.5 p-4 text-[0.9em]">
          {[
            ['FileSignature', 'АОСР и акты формируются из шаблонов, подпись — прямо в телефоне'],
            ['Send', 'Предписание уходит подрядчику и заказчику из карточки замечания'],
            ['Archive', 'Реестр по объекту и сводный по проекту — с накопителем предписаний'],
            ['Server', 'Все версии документов хранятся на едином сервере компании'],
          ].map(([icon, text]) => (
            <li key={text} className="flex gap-3">
              <Icon name={icon} size={16} className="mt-0.5 flex-none text-accent" />
              <span className="text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
};

export default DocumentsSection;