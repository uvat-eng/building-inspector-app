import { useEffect, useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import PhotoButton from '@/components/desk/inspection/PhotoButton';
import { Inspection, useDefects } from '@/data/inspections';
import { usePhotoQueue, flushQueue, isWifi } from '@/data/photoQueue';
import { downloadAct } from '@/lib/actDoc';

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
      await add(title.trim());
      setTitle('');
    } catch {
      toast({ title: 'Не удалось добавить замечание', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const saveAct = () => {
    downloadAct({ inspection, defects, objectTitle, contractorName });
    onFinish(inspection);
    toast({ title: 'Акт сохранён', description: `Файл Word · № ${inspection.number}` });
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
            <p>Представитель подрядчика: {inspection.contractorRep}</p>
            <p>Инспектор: {inspection.inspector || '—'}</p>
          </div>
        </section>

        <Panel title="Результаты осмотра" note={`${defects.length} замечаний`}>
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
                <span className="min-w-0 flex-1">Наименование замечания</span>
                <span className="w-[52px] flex-none text-center">Фото</span>
                <span className="w-8 flex-none" />
              </div>
              {defects.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2 px-3 py-2.5">
                  <span className="w-7 flex-none text-center font-head text-[0.9em]">{i + 1}</span>
                  <Input
                    defaultValue={d.title}
                    onBlur={(e) =>
                      e.target.value !== d.title && update(d.id, { title: e.target.value })
                    }
                    className="h-9 min-w-0 flex-1 rounded-sm border-transparent bg-transparent px-2 hover:border-border focus:border-border"
                  />
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
            className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="FileDown" size={16} />
            Сохранить акт (Word)
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
