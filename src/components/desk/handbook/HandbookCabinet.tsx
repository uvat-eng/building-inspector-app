import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import CabinetBar from '@/components/desk/CabinetBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useHandbook, KIND_ICON } from '@/data/handbook';

interface HandbookCabinetProps {
  onBack?: () => void;
}

const PAGE = 40;

const HandbookCabinet = ({ onBack }: HandbookCabinetProps) => {
  const { toast } = useToast();
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useHandbook(kind, query, page, PAGE);

  const pages = Math.max(1, Math.ceil(data.found / PAGE));

  const pick = (k: string) => {
    setKind(k === kind ? '' : k);
    setPage(1);
  };

  const copy = async (text: string, ref: string) => {
    try {
      await navigator.clipboard.writeText(`${text}\n${ref}`);
      toast({ title: 'Скопировано', description: 'Формулировка и пункт НтД в буфере обмена' });
    } catch {
      toast({ title: 'Не удалось скопировать', variant: 'destructive' });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {onBack && (
        <CabinetBar
          crumbs={[
            { label: 'Кабинет', icon: 'LayoutGrid', onClick: onBack },
            { label: 'Справочник типовых нарушений', icon: 'BookMarked' },
          ]}
          backLabel="В кабинет"
          onBack={onBack}
        />
      )}

      <Panel
        title="Разделы работ"
        note={`${data.total} записей`}
        className="flex-none"
      >
        <div className="flex flex-wrap gap-1.5 p-3">
          <button
            type="button"
            onClick={() => pick('')}
            className={cn(
              'flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[0.78em] transition-colors',
              kind === ''
                ? 'border-accent bg-accent text-accent-foreground'
                : 'border-border bg-card hover:border-accent hover:bg-secondary',
            )}
          >
            <Icon name="List" size={13} />
            Все разделы
            <span className="font-head">{data.total}</span>
          </button>
          {data.kinds.map((k) => (
            <button
              key={k.kind}
              type="button"
              onClick={() => pick(k.kind)}
              title={k.kind}
              className={cn(
                'flex max-w-[16rem] items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[0.78em] transition-colors',
                kind === k.kind
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-card hover:border-accent hover:bg-secondary',
              )}
            >
              <Icon
                name={KIND_ICON[k.kind] || 'Circle'}
                fallback="Circle"
                size={13}
                className="flex-none"
              />
              <span className="truncate">{k.kind}</span>
              <span className="flex-none font-head">{k.count}</span>
            </button>
          ))}
        </div>
      </Panel>

      <div className="flex flex-none flex-wrap items-center gap-2">
        <span className="relative min-w-0 flex-1 sm:max-w-md">
          <Icon
            name="Search"
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Поиск по нарушению или пункту НтД"
            className="pl-9"
          />
        </span>
        {(query || kind) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery('');
              setKind('');
              setPage(1);
            }}
          >
            <Icon name="X" size={14} className="mr-1.5" />
            Сбросить
          </Button>
        )}
        <span className="text-[0.78em] text-muted-foreground">
          {loading ? 'Загрузка…' : `Найдено ${data.found}`}
        </span>
      </div>

      <Panel
        title={kind || 'Типовые нарушения'}
        note={pages > 1 ? `стр. ${data.page} из ${pages}` : undefined}
        className="min-h-0 flex-1"
      >
        {error ? (
          <Empty icon="CloudOff" title="Справочник недоступен" hint={error} />
        ) : loading && !data.items.length ? (
          <Empty icon="Loader" title="Загружаем справочник" hint="Это займёт пару секунд." />
        ) : !data.items.length ? (
          <Empty
            icon="SearchX"
            title="Ничего не найдено"
            hint="Измените запрос или выберите другой раздел работ."
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-y-auto">
            <div className="flex flex-col divide-y divide-border">
              {data.items.map((it, i) => (
                <div key={`${it.ref}-${i}`} className="group flex gap-3 px-3 py-2.5">
                  <span className="mt-0.5 w-8 flex-none text-right font-head text-[0.78em] text-muted-foreground">
                    {(data.page - 1) * PAGE + i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-pre-line text-[0.86em] leading-snug">
                      {it.text}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="flex items-start gap-1.5 rounded-sm border border-accent/40 bg-secondary/60 px-2 py-1 text-[0.76em]">
                        <Icon
                          name="BookOpen"
                          size={12}
                          className="mt-0.5 flex-none text-accent"
                        />
                        <span className="whitespace-pre-line">{it.ref}</span>
                      </span>
                      {!kind && (
                        <span className="flex items-center gap-1 text-[0.72em] text-muted-foreground">
                          <Icon
                            name={KIND_ICON[it.kind] || 'Circle'}
                            fallback="Circle"
                            size={11}
                          />
                          {it.kind}
                        </span>
                      )}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(it.text, it.ref)}
                    title="Скопировать формулировку и пункт"
                    className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    <Icon name="Copy" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {pages > 1 && (
        <div className="flex flex-none items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Icon name="ChevronLeft" size={14} />
            Назад
          </Button>
          <span className="font-head text-[0.82em] tracking-[0.08em]">
            {data.page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= pages || loading}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Вперёд
            <Icon name="ChevronRight" size={14} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default HandbookCabinet;