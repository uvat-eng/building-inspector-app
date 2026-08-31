import { useEffect, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Icon from '@/components/ui/icon';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DEFECTS, NORM_HINTS, Defect } from '@/data/mock';

const DICTATION = 'Защитный слой бетона на захватке 2 занижен, замер 12 мм при проектных 25 мм';

const DefectsSection = () => {
  const [items, setItems] = useState<Defect[]>(DEFECTS);
  const [text, setText] = useState('');
  const [rec, setRec] = useState(false);
  const [selected, setSelected] = useState<string | null>(DEFECTS[0].id);
  const { toast } = useToast();

  useEffect(() => {
    if (!rec) return;
    let i = 0;
    setText('');
    const timer = window.setInterval(() => {
      i += 2;
      setText(DICTATION.slice(0, i));
      if (i >= DICTATION.length) {
        window.clearInterval(timer);
        setRec(false);
      }
    }, 35);
    return () => window.clearInterval(timer);
  }, [rec]);

  const lower = text.toLowerCase();
  const hints = NORM_HINTS.filter((h) => h.key.some((k) => lower.includes(k)));

  const toggleFixed = (id: string) => {
    setItems((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              fixed: !d.fixed,
              tag: !d.fixed ? 'Устранено' : 'В работе',
              tone: !d.fixed ? 'ok' : 'wait',
              unread: false,
            }
          : d,
      ),
    );
  };

  const open = items.filter((d) => !d.fixed);
  const current = items.find((d) => d.id === selected) ?? items[0];

  const save = () => {
    if (text.trim().length < 5) {
      toast({ title: 'Слишком короткое замечание', description: 'Продиктуйте или впишите суть.' });
      return;
    }
    const next: Defect = {
      id: `d${Date.now()}`,
      no: `П-53/${items.length + 1}`,
      title: text.trim().slice(0, 70),
      sub: 'Черновик · срок 3 дня',
      tag: 'Новое',
      tone: 'hot',
      unread: true,
      norm: hints[0]?.norm ?? 'Пункт нормы не подобран',
      object: 'ДНС-3',
      fixed: false,
    };
    setItems((prev) => [next, ...prev]);
    setSelected(next.id);
    setText('');
    toast({ title: 'Замечание записано', description: `${next.no} · ${next.norm}` });
  };

  return (
    <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-2 lg:grid-rows-2">
      <Panel title="Открытые замечания" note={`${open.length} в работе`} className="lg:row-span-2">
        {items.map((d) => (
          <Row
            key={d.id}
            title={`${d.no} · ${d.title}`}
            sub={`${d.sub} · ${d.norm}`}
            unread={d.unread}
            active={d.id === selected}
            onClick={() => setSelected(d.id)}
            right={<Tag tone={d.tone}>{d.tag}</Tag>}
          />
        ))}
      </Panel>

      <Panel title="Голосовой ввод замечания" note="ИИ-подбор пункта">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRec(true)}
              className={`flex items-center gap-2 rounded-sm px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.06em] transition-opacity ${
                rec ? 'animate-pulse bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              <Icon name={rec ? 'AudioLines' : 'Mic'} size={16} />
              {rec ? 'Идёт запись…' : 'Продиктовать'}
            </button>
            <span className="text-[0.82em] text-muted-foreground">
              Речь распознаётся на устройстве, работает офлайн
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Суть замечания…"
            className="rounded-sm"
          />
          <div className="min-h-[76px] rounded-sm border border-dashed border-border p-3">
            <div className="mb-2 text-[0.75em] uppercase tracking-[0.14em] text-muted-foreground">
              ИИ подобрал пункты норм
            </div>
            {hints.length === 0 ? (
              <p className="text-[0.85em] text-muted-foreground">
                Начните диктовать — система предложит пункт СП и формулировку.
              </p>
            ) : (
              <ul className="space-y-2">
                {hints.map((h) => (
                  <li key={h.norm} className="animate-fade-in text-[0.88em]">
                    <span className="font-bold text-accent">{h.norm}</span>
                    <span className="block text-muted-foreground">{h.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={save}
            className="self-start rounded-sm bg-accent px-6 py-3 font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground transition-opacity hover:opacity-90"
          >
            Выдать предписание
          </button>
        </div>
      </Panel>

      <Panel title="Карточка замечания" note={current?.no}>
        {current && (
          <div className="flex flex-col gap-3 p-4 text-[0.92em]">
            <div className="font-bold">{current.title}</div>
            <div className="text-muted-foreground">
              {current.object} · {current.sub}
            </div>
            <div className="rounded-sm bg-secondary px-3 py-2">
              Пункт нормы: <span className="font-bold text-accent">{current.norm}</span>
            </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-3">
              <input
                type="checkbox"
                checked={current.fixed}
                onChange={() => toggleFixed(current.id)}
                className="h-4 w-4 accent-[hsl(var(--accent))]"
              />
              <span>Замечание устранено — отметка инспектора</span>
              {current.fixed && <Icon name="Check" size={16} className="ml-auto text-success" />}
            </label>
            <p className="text-[0.85em] text-muted-foreground">
              Накопитель предписаний ведётся по объекту и суммарно по проекту.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default DefectsSection;
