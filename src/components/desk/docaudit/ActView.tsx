import Icon from '@/components/ui/icon';
import { AuditNote, DocReview, fmtDate, severityStyle } from '@/data/docaudit';

interface Props {
  title: string;
  subtitle: string;
  review: DocReview;
  notes: AuditNote[];
  verdict: string;
  score?: number;
  scoreLabel?: string;
  extraNote?: string;
  extraNoteTitle?: string;
}

/** Акт по результатам проверки: шапка, замечания со ссылками на НтД, вывод. */
const ActView = ({
  title,
  subtitle,
  review,
  notes,
  verdict,
  score,
  scoreLabel,
  extraNote,
  extraNoteTitle,
}: Props) => (
  <section className="rounded-sm border border-border border-t-2 border-t-accent bg-card">
    <header className="border-b border-border px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="FileCheck2" size={17} className="flex-none text-accent" />
        <h3 className="font-head text-[1em] uppercase tracking-[0.04em]">{title}</h3>
        <span className="ml-auto text-[0.76em] uppercase tracking-[0.08em] text-muted-foreground">
          {fmtDate(review.checkedAt)}
        </span>
      </div>
      <p className="mt-1.5 text-[0.82em] text-muted-foreground">{subtitle}</p>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[0.8em]">
        <span>
          Объект: <b>{review.objectName || '—'}</b>
        </span>
        <span>
          Инспектор: <b>{review.inspector || '—'}</b>
        </span>
        <span>
          Замечаний: <b>{notes.length}</b>
        </span>
      </div>
    </header>

    {typeof score === 'number' && (
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
        <span className="text-[0.8em] uppercase tracking-[0.08em] text-muted-foreground">
          {scoreLabel}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.max(3, score)}%` }}
          />
        </div>
        <span className="font-head text-[1.1em] text-accent">{score}%</span>
      </div>
    )}

    <div className="divide-y divide-border">
      {notes.length === 0 ? (
        <p className="px-4 py-6 text-center text-[0.87em] text-muted-foreground sm:px-5">
          Замечаний не выявлено.
        </p>
      ) : (
        notes.map((n) => (
          <article key={n.id} className="px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-head text-[0.95em] text-accent">№ {n.num}</span>
              <span
                className={`rounded-sm px-2 py-0.5 text-[0.72em] uppercase tracking-[0.06em] ${severityStyle(n.severity)}`}
              >
                {n.severity}
              </span>
              {!!n.section && (
                <span className="text-[0.78em] text-muted-foreground">{n.section}</span>
              )}
            </div>

            <p className="mt-2 text-[0.9em] leading-relaxed">{n.text}</p>

            {!!n.norm && (
              <div className="mt-2.5 border-l-2 border-accent bg-secondary/50 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[0.8em] font-semibold">
                  <Icon name="BookMarked" size={13} className="flex-none text-accent" />
                  {n.norm}
                </p>
                {!!n.quote && (
                  <p className="mt-1 text-[0.82em] italic text-muted-foreground">«{n.quote}»</p>
                )}
              </div>
            )}

            {!!n.demand && (
              <p className="mt-2 flex gap-1.5 text-[0.84em]">
                <Icon name="ArrowRight" size={14} className="mt-0.5 flex-none text-accent" />
                <span>
                  <b>Требуется: </b>
                  {n.demand}
                </span>
              </p>
            )}
          </article>
        ))
      )}
    </div>

    {!!extraNote && (
      <div className="border-t border-border px-4 py-3.5 sm:px-5">
        <p className="text-[0.76em] uppercase tracking-[0.1em] text-muted-foreground">
          {extraNoteTitle}
        </p>
        <p className="mt-1.5 text-[0.88em] leading-relaxed">{extraNote}</p>
      </div>
    )}

    <footer className="border-t border-border bg-secondary/40 px-4 py-3.5 sm:px-5">
      <p className="text-[0.76em] uppercase tracking-[0.1em] text-muted-foreground">Вывод</p>
      <p className="mt-1.5 text-[0.9em] leading-relaxed">{verdict || 'Вывод не сформирован.'}</p>
    </footer>
  </section>
);

export default ActView;
