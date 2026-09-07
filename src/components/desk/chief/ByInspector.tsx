import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import { useChiefScope } from '@/data/chief';
import { User } from '@/data/users';
import IndReportsCabinet from '@/components/desk/indreports/IndReportsCabinet';
import JournalCabinet from '@/components/desk/journal/JournalCabinet';
import { useIndReports } from '@/data/indreports';
import { useJournal } from '@/data/journal';

export type ByKind = 'indreports' | 'journal';

interface ByInspectorProps {
  kind: ByKind;
  onBack?: () => void;
}

const INFO: Record<ByKind, { title: string; note: string; icon: string }> = {
  indreports: {
    title: 'Индивидуальные отчёты инспекторов',
    note: 'Пофамильно · внутри — по датам, свежие сверху',
    icon: 'ClipboardPen',
  },
  journal: {
    title: 'Индивидуальные журналы ИСК',
    note: 'Пофамильно · записи, выгрузка и отправка заказчику',
    icon: 'BookText',
  },
};

const ByInspector = ({ kind, onBack }: ByInspectorProps) => {
  const { inspectors } = useChiefScope();
  const [who, setWho] = useState<string | null>(null);

  const { items: reports } = useIndReports({});
  const { items: journal } = useJournal({});

  const info = INFO[kind];

  const rows = useMemo(
    () =>
      inspectors.map((u: User) => {
        const mine =
          kind === 'indreports'
            ? reports.filter((r) => r.authorFio === u.fio)
            : journal.filter((r) => r.authorFio === u.fio);
        const last = (mine as { date?: string; createdAt?: string }[])
          .map((r) => r.date || r.createdAt || '')
          .filter(Boolean)
          .sort()
          .reverse()[0];
        return { user: u, count: mine.length, last };
      }),
    [inspectors, reports, journal, kind],
  );

  if (who) {
    return kind === 'indreports' ? (
      <IndReportsCabinet author={who} onBack={() => setWho(null)} />
    ) : (
      <JournalCabinet author={who} onBack={() => setWho(null)} />
    );
  }

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          К обзору
        </button>
      )}

      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
        <h1 className="font-head text-[1.05em] uppercase leading-tight tracking-[0.03em]">
          {info.title}
        </h1>
        <p className="mt-1 text-[0.85em] text-muted-foreground">{info.note}</p>
      </section>

      <Panel title="Инспекторы в подчинении" note={`${rows.length}`}>
        {rows.length === 0 ? (
          <Empty
            icon="Users"
            title="Инспекторов нет"
            hint="Закрепите инспекторов за собой или за своими объектами в разделе «Персонал»."
          />
        ) : (
          rows.map((r) => (
            <button
              key={r.user.id}
              type="button"
              onClick={() => setWho(r.user.fio)}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/60"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                <Icon name="User" size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-head text-[0.94em] uppercase tracking-[0.03em]">
                  {r.user.fio}
                </span>
                <span className="block truncate text-[0.76em] text-muted-foreground">
                  {r.count} записей
                  {r.last ? ` · последняя ${new Date(r.last).toLocaleDateString('ru')}` : ''}
                </span>
              </span>
              <Icon name="ChevronRight" size={17} className="flex-none text-accent" />
            </button>
          ))
        )}
      </Panel>
    </div>
  );
};

export default ByInspector;
