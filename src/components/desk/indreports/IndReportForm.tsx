import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProjectObject } from '@/data/store';
import HeaderFields from '@/components/desk/indreports/HeaderFields';
import BodyFields from '@/components/desk/indreports/BodyFields';
import { IndReport, IndReportData, IndReportKind } from '@/data/indreports';

interface IndReportFormProps {
  objects: ProjectObject[];
  authorFio: string;
  authorId: string;
  editing?: IndReport | null;
  template?: IndReport | null;
  busy?: boolean;
  onBack: () => void;
  onSave: (payload: Partial<IndReport>) => void;
}

const IndReportForm = ({
  objects,
  authorFio,
  authorId,
  editing,
  template,
  busy,
  onBack,
  onSave,
}: IndReportFormProps) => {
  const { toast } = useToast();
  const base = editing ?? template ?? null;

  const [kind, setKind] = useState<IndReportKind>(base?.kind ?? 'obustroystvo');
  const [objectId, setObjectId] = useState(base?.objectId || objects[0]?.id || '');
  const [number, setNumber] = useState(editing?.number ?? '');
  const [date, setDate] = useState(
    editing?.date || new Date().toISOString().slice(0, 10),
  );
  const [data, setData] = useState<IndReportData>(() =>
    base ? { ...base.data, ...(template ? { photos: [] } : {}) } : {},
  );

  const object = objects.find((o) => o.id === objectId);

  useEffect(() => {
    if (base) return;
    if (!object) return;
    setData((p) => ({
      ...p,
      objectTitle: p.objectTitle || object.title,
      customerName: p.customerName || object.customer,
      contractNo: p.contractNo || object.contractNo,
      contractDate: p.contractDate || object.contractDate || '',
    }));
  }, [object, base]);

  const set = (patch: Partial<IndReportData>) => setData((p) => ({ ...p, ...patch }));

  const submit = () => {
    if (!objectId) {
      toast({ title: 'Выберите объект', variant: 'destructive' });
      return;
    }
    if (!number.trim()) {
      toast({ title: 'Укажите номер отчёта', variant: 'destructive' });
      return;
    }
    onSave({
      kind,
      objectId,
      number: number.trim(),
      date,
      data,
      authorId: editing?.authorId || authorId,
      authorFio: editing?.authorFio || authorFio,
      updatedBy: authorFio,
    });
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        К отчётам
      </button>

      {template && !editing && (
        <p className="flex items-center gap-2 rounded-sm border border-accent/40 bg-accent/5 px-3 py-2 text-[0.82em]">
          <Icon name="Copy" size={15} className="flex-none text-accent" />
          Создаётся по образцу отчёта № {template.number} — поля заполнены, снимки очищены.
        </p>
      )}

      <HeaderFields
        objects={objects}
        objectId={objectId}
        setObjectId={setObjectId}
        kind={kind}
        setKind={setKind}
        number={number}
        setNumber={setNumber}
        date={date}
        setDate={setDate}
        data={data}
        set={set}
      />

      <BodyFields kind={kind} data={data} set={set} />

      <div className="flex flex-none gap-2 pb-1">
        <Button variant="outline" className="flex-1 rounded-sm" onClick={onBack}>
          Отмена
        </Button>
        <Button
          disabled={busy}
          onClick={submit}
          className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name={busy ? 'Loader2' : 'Check'} size={17} className={busy ? 'animate-spin' : ''} />
          {editing ? 'Сохранить изменения' : 'Сохранить отчёт'}
        </Button>
      </div>
    </div>
  );
};

export default IndReportForm;
