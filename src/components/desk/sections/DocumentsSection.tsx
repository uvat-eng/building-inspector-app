import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { DOCS, Doc } from '@/data/mock';

const KINDS = [
  { id: 'all', label: 'Все' },
  { id: 'act', label: 'Акты' },
  { id: 'order', label: 'Предписания' },
  { id: 'scheme', label: 'Схемы' },
  { id: 'photo', label: 'Фотоотчёты' },
] as const;

const DocumentsSection = () => {
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('all');
  const [docs, setDocs] = useState<Doc[]>(DOCS);
  const { toast } = useToast();

  const list = kind === 'all' ? docs : docs.filter((d) => d.kind === kind);

  const sign = (id: string) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, tag: 'Подписан', tone: 'ok', unread: false, sub: `${d.sub.split(' · ')[0]} · подписан` } : d,
      ),
    );
    toast({ title: 'Документ подписан', description: 'Электронная подпись инспектора применена.' });
  };

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
              </button>
            ))}
          </span>
        }
      >
        {list.map((d) => (
          <Row
            key={d.id}
            title={d.title}
            sub={d.sub}
            unread={d.unread}
            onClick={() => d.tag === 'Подписать' && sign(d.id)}
            right={<Tag tone={d.tone}>{d.tag}</Tag>}
          />
        ))}
        {list.length === 0 && (
          <p className="p-4 text-[0.9em] text-muted-foreground">В этой категории пока пусто.</p>
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
