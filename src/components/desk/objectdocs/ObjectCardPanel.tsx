import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { CARD_SUMMARY_FIELDS, useObjectDocs } from '@/data/objectdocs';

interface ObjectCardPanelProps {
  objectId: string;
}

const ruDate = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('ru');
};

const ObjectCardPanel = ({ objectId }: ObjectCardPanelProps) => {
  const { items, loading } = useObjectDocs('card', objectId);
  const card = items[0] ?? null;
  const filled = card ? CARD_SUMMARY_FIELDS.filter((f) => card.summary?.[f.key]) : [];

  return (
    <Panel
      title="Контрольная карточка объекта"
      note={card ? `ред. ${card.version} · ${ruDate(card.docDate || card.createdAt)}` : 'нет данных'}
    >
      {loading ? (
        <p className="flex items-center gap-2 p-4 text-[0.85em] text-muted-foreground">
          <Icon name="Loader2" size={15} className="animate-spin" />
          Загружаем карточку…
        </p>
      ) : !card ? (
        <Empty
          icon="ClipboardCheck"
          title="Карточка не загружена"
          hint="Инспектор загружает её в разделе «Контрольная карточка объекта»."
        />
      ) : (
        <>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
              <Icon name="ClipboardCheck" size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.92em]">{card.title || card.fileName}</span>
              <span className="block truncate text-[0.76em] text-muted-foreground">
                {card.contractor || '—'}
                {card.docNumber ? ` · ${card.docNumber}` : ''} · загрузил {card.uploadedBy}
              </span>
            </span>
            <Tag tone={card.status === 'актуально' ? 'ok' : 'wait'}>{card.status}</Tag>
            <a
              href={card.url}
              target="_blank"
              rel="noreferrer"
              title="Открыть файл"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
            >
              <Icon name="Download" size={14} />
            </a>
          </div>

          {filled.length > 0 && (
            <div className="grid gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-2">
              {filled.map((f) => (
                <span key={f.key} className="flex items-baseline justify-between gap-2 text-[0.86em]">
                  <span className="truncate text-muted-foreground">{f.label}</span>
                  <span className="font-head">{card.summary[f.key]}</span>
                </span>
              ))}
            </div>
          )}

          {card.note && (
            <p className="border-t border-border px-4 py-2.5 text-[0.82em] text-muted-foreground">
              {card.note}
            </p>
          )}
        </>
      )}
    </Panel>
  );
};

export default ObjectCardPanel;
