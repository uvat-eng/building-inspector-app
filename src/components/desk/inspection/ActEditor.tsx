import { useEffect, useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import PhotoButton from '@/components/desk/inspection/PhotoButton';
import {
  Inspection,
  useDefects,
  suggestNorms,
  NormMatch,
  Severity,
  SEVERITY,
  deadlineFor,
  uploadAct,
  teachNorm,
} from '@/data/inspections';
import { cn } from '@/lib/utils';
import { usePhotoQueue, flushQueue, isWifi } from '@/data/photoQueue';
import { downloadAct, buildActHtml } from '@/lib/actDoc';

interface ActEditorProps {
  inspection: Inspection;
  objectTitle: string;
  contractorName?: string;
  onBack: () => void;
  onFinish: (i: Inspection) => void;
  onOrder: (i: Inspection) => void;
}

const ActEditor = ({
  inspection,
  objectTitle,
  contractorName,
  onBack,
  onFinish,
  onOrder,
}: ActEditorProps) => {
  const { toast } = useToast();
  const { defects, add, update, remove, reload } = useDefects(inspection.id);
  const { photos, pending, refresh } = usePhotoQueue(inspection.id);
  const [title, setTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [normBusy, setNormBusy] = useState<string | null>(null);
  const [altsFor, setAltsFor] = useState<Map<string, { ref: string; name: string }[]>>(new Map());

  const applyMatch = async (id: string, m: NormMatch) => {
    if (m.ref) await update(id, { normRef: `${m.ref} — ${m.name}` });
    if (m.alts?.length) setAltsFor((p) => new Map(p).set(id, m.alts ?? []));
  };

  const saveOwnRef = async (id: string, title: string, was: string, now: string) => {
    const val = now.trim();
    if (val === was.trim()) return;
    await update(id, { normRef: val });
    if (!val || !title.trim()) return;
    try {
      await teachNorm(title, val, inspection.inspector);
      toast({
        title: 'Ссылка запомнена',
        description: 'При похожем замечании подставится автоматически — у всех инженеров',
      });
    } catch {
      /* правка сохранена в акте, обучение повторится позже */
    }
  };

  const findNorm = async (id: string, text: string) => {
    if (!text.trim()) return;
    setNormBusy(id);
    try {
      const [m] = await suggestNorms([text], true);
      if (m?.ref) {
        await applyMatch(id, m);
        toast({
          title: 'Норма уточнена',
          description:
            m.source === 'manual'
              ? `Ссылку ранее задал инженер${m.author ? `: ${m.author}` : ''}`
              : m.source === 'archive'
                ? `Из архива предписаний${m.archive?.date ? ` от ${m.archive.date}` : ''}`
                : m.source === 'archive-ai'
                  ? 'Из архива предписаний, сверено ИИ'
                  : m.source === 'ai'
                    ? 'Подобрано ИИ-агентом'
                    : 'Подобрано по базе норм',
        });
      }
    } catch {
      toast({ title: 'Не удалось подобрать норму', variant: 'destructive' });
    } finally {
      setNormBusy(null);
    }
  };

  const findAll = async () => {
    const empty = defects.filter((d) => !d.normRef && d.title.trim());
    if (!empty.length) {
      toast({ title: 'Все нормы уже проставлены' });
      return;
    }
    setNormBusy('all');
    try {
      const res = await suggestNorms(empty.map((d) => d.title), true);
      await Promise.all(empty.map((d, i) => (res[i] ? applyMatch(d.id, res[i]) : null)));
      toast({ title: `Подобрано норм: ${res.filter((r) => r.ref).length}` });
    } catch {
      toast({ title: 'Не удалось подобрать нормы', variant: 'destructive' });
    } finally {
      setNormBusy(null);
    }
  };

  useEffect(() => {
    const t = window.setInterval(() => {
      if (pending > 0 && isWifi()) flushQueue().then(() => { refresh(); reload(); }).catch(() => undefined);
    }, 30000);
    return () => window.clearInterval(t);
  }, [pending, refresh, reload]);

  const localCount = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((p) => map.set(p.defectId, (map.get(p.defectId) ?? 0) + 1));
    return map;
  }, [photos]);

  const addDefect = async () => {
    if (!title.trim()) {
      toast({ title: 'Впишите замечание', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const created = await add(title.trim());
      setTitle('');
      update(created.id, { severity: 'normal', deadline: deadlineFor('normal') });
      suggestNorms([created.title], true)
        .then(([m]) => {
          if (m) applyMatch(created.id, m);
        })
        .catch(() => undefined);
    } catch {
      toast({ title: 'Не удалось добавить замечание', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const [saving, setSaving] = useState(false);

  const saveAct = async () => {
    setSaving(true);
    const data = { inspection, defects, objectTitle, contractorName };
    downloadAct(data);
    try {
      await uploadAct(inspection.id, buildActHtml(data));
      onFinish(inspection);
      toast({
        title: `Акт № ${inspection.number} сохранён`,
        description: 'Файл скачан и добавлен в реестр объекта',
      });
    } catch {
      onFinish(inspection);
      toast({
        title: 'Акт скачан, но не попал в реестр',
        description: 'Нет связи — нажмите «Сохранить акт» ещё раз при интернете',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    const { sent, left } = await flushQueue(true);
    refresh();
    reload();
    toast({
      title: sent ? `Отправлено фото: ${sent}` : 'Нет связи',
      description: left ? `Осталось в очереди: ${left}` : 'Очередь пуста',
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div className="flex flex-none flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={14} className="text-accent" />
          К проверкам
        </button>
        {pending > 0 && (
          <button
            type="button"
            onClick={sendNow}
            className="ml-auto flex items-center gap-1.5 rounded-sm border border-warning bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-warning transition-colors hover:bg-secondary"
          >
            <Icon name="CloudUpload" size={14} />
            В очереди {pending} · отправить
          </button>
        )}
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Акт осмотра № {inspection.number} · {new Date(inspection.createdAt).toLocaleDateString('ru')}
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {objectTitle}
          </h1>
          <div className="mt-3 space-y-1 border-t border-border pt-2.5 text-[0.83em] text-muted-foreground">
            <p>Вид работ: {inspection.workType}</p>
            {inspection.docRef && <p>Раздел проекта: {inspection.docRef}</p>}
            <p>Генподрядчик: {inspection.generalContractor || contractorName || '—'}</p>
            {inspection.subcontractor && <p>Субподрядчик: {inspection.subcontractor}</p>}
            <p>Представитель подрядчика: {inspection.contractorRep}</p>
            <p>Инспектор: {inspection.inspector || '—'}</p>
          </div>
        </section>

        <Panel
          title="Результаты осмотра"
          note={`${defects.length} замечаний`}
          action={
            defects.length > 0 ? (
              <button
                type="button"
                onClick={findAll}
                disabled={normBusy === 'all'}
                className="ml-3 flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.76em] uppercase tracking-[0.06em] text-accent-foreground transition-colors hover:bg-accent/90"
              >
                <Icon
                  name={normBusy === 'all' ? 'Loader2' : 'Sparkles'}
                  size={13}
                  className={normBusy === 'all' ? 'animate-spin' : ''}
                />
                Нормы
              </button>
            ) : undefined
          }
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDefect()}
              placeholder="Наименование замечания"
              className="h-9 rounded-sm"
            />
            <button
              type="button"
              onClick={addDefect}
              disabled={adding}
              className="flex h-9 flex-none items-center gap-1.5 rounded-sm bg-accent px-3 text-[0.8em] uppercase tracking-[0.06em] text-accent-foreground transition-colors hover:bg-accent/90"
            >
              <Icon name={adding ? 'Loader2' : 'Plus'} size={15} className={adding ? 'animate-spin' : ''} />
              Добавить
            </button>
          </div>

          {defects.length === 0 ? (
            <p className="px-4 py-6 text-center text-[0.85em] text-muted-foreground">
              Замечаний не выявлено. Можно сразу сохранить акт.
            </p>
          ) : (
            <div className="divide-y divide-border">
              <div className="flex items-center gap-2 bg-secondary/60 px-3 py-2 text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                <span className="w-7 flex-none text-center">№</span>
                <span className="min-w-0 flex-1">Замечание и ссылка на нормативы</span>
                <span className="w-[52px] flex-none text-center">Фото</span>
                <span className="w-8 flex-none" />
              </div>
              {defects.map((d, i) => (
                <div key={d.id} className="flex items-start gap-2 px-3 py-2.5">
                  <span className="w-7 flex-none pt-2 text-center font-head text-[0.9em]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input
                      defaultValue={d.title}
                      onBlur={(e) =>
                        e.target.value !== d.title && update(d.id, { title: e.target.value })
                      }
                      className="h-9 w-full rounded-sm border-transparent bg-transparent px-2 hover:border-border focus:border-border"
                    />
                    <div className="flex items-center gap-1.5 pl-2">
                      <Icon name="BookMarked" size={13} className="flex-none text-accent" />
                      <Input
                        defaultValue={d.normRef}
                        key={d.normRef}
                        onBlur={(e) => saveOwnRef(d.id, d.title, d.normRef, e.target.value)}
                        placeholder="Пункт норм подбирается автоматически…"
                        className="h-7 w-full rounded-sm border-transparent bg-transparent px-1 text-[0.8em] text-muted-foreground hover:border-border focus:border-border"
                      />
                      <button
                        type="button"
                        title="Уточнить норму (ИИ)"
                        disabled={normBusy === d.id}
                        onClick={() => findNorm(d.id, d.title)}
                        className="flex h-7 w-7 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
                      >
                        <Icon
                          name={normBusy === d.id ? 'Loader2' : 'Sparkles'}
                          size={13}
                          className={normBusy === d.id ? 'animate-spin' : ''}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 pl-2 pt-0.5">
                      <Icon name="CalendarClock" size={13} className="flex-none text-accent" />
                      {(['critical', 'normal', 'minor'] as Severity[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            update(d.id, { severity: s, deadline: deadlineFor(s) })
                          }
                          className={cn(
                            'rounded-sm px-2 py-0.5 text-[0.72em] uppercase tracking-[0.06em] transition-colors',
                            (d.severity || 'normal') === s
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-secondary text-muted-foreground hover:bg-border',
                          )}
                        >
                          {SEVERITY[s].label}
                        </button>
                      ))}
                      <span className="text-[0.74em] text-muted-foreground">
                        до {d.deadline || deadlineFor(d.severity || 'normal')}
                      </span>
                    </div>

                    {(altsFor.get(d.id) ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-2 pt-0.5">
                        {(altsFor.get(d.id) ?? []).map((a) => (
                          <button
                            key={a.ref}
                            type="button"
                            onClick={() =>
                              saveOwnRef(d.id, d.title, d.normRef, `${a.ref} — ${a.name}`)
                            }
                            className="rounded-sm border border-border px-1.5 py-0.5 text-[0.7em] text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                          >
                            {a.ref}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <PhotoButton
                    inspectionId={inspection.id}
                    defectId={d.id}
                    count={d.photos.length + (localCount.get(d.id) ?? 0)}
                    onDone={() => {
                      refresh();
                      reload();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className="flex h-9 w-8 flex-none items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Icon name="X" size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="flex flex-none flex-col gap-2 sm:flex-row">
          <Button
            onClick={saveAct}
            disabled={saving}
            className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={saving ? 'Loader2' : 'FileDown'}
              size={16}
              className={saving ? 'animate-spin' : ''}
            />
            Сохранить акт
          </Button>
          {defects.length > 0 && (
            <Button
              variant="outline"
              onClick={() => onOrder(inspection)}
              className="flex-1 gap-2 rounded-sm font-head uppercase tracking-[0.06em]"
            >
              <Icon name="FileWarning" size={16} />
              Оформить предписание
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActEditor;