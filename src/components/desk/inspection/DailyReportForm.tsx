import { useMemo, useRef, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ProjectObject } from '@/data/store';
import { useProfile } from '@/data/profile';
import { useContractor } from '@/data/orders';
import {
  CATEGORIES,
  DailyReport,
  EMPTY_ROW,
  NATURE,
  buildArchive,
  ReportRow,
  rid,
  statsOf,
  uploadReportPhoto,
  useReports,
} from '@/data/reports';
import { downloadDailyReport } from '@/lib/reportXls';

interface Props {
  object: ProjectObject;
  onBack: () => void;
  existing?: DailyReport | null;
}

const today = () => new Date().toISOString().slice(0, 10);

const Field = ({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) => (
  <div className={wide ? 'sm:col-span-2' : undefined}>
    <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);

const Photos = ({
  objectId,
  urls,
  onChange,
}: {
  objectId: string;
  urls: string[];
  onChange: (next: string[]) => void;
}) => {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) added.push(await uploadReportPhoto(objectId, f));
      onChange([...urls, ...added]);
      toast({ title: `Фото прикреплено: ${added.length}` });
    } catch {
      toast({ title: 'Не удалось загрузить фото', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="sm:col-span-2">
      <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
        Фотоматериалы
      </Label>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {urls.map((u) => (
          <span key={u} className="group relative">
            <img
              src={u}
              alt="фото нарушения"
              className="h-16 w-16 rounded-sm border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(urls.filter((x) => x !== u))}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              <Icon name="X" size={12} />
            </button>
          </span>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <Icon
            name={busy ? 'Loader2' : 'Camera'}
            size={18}
            className={busy ? 'animate-spin' : ''}
          />
          <span className="text-[0.62em] uppercase tracking-[0.06em]">Прикрепить</span>
        </button>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  );
};

const DailyReportForm = ({ object, onBack, existing }: Props) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { list: contractors } = useContractor(object.id);
  const { items, save } = useReports(object.id);

  const [date, setDate] = useState(existing?.date || today());
  const [note, setNote] = useState(existing?.note || '');
  const [rows, setRows] = useState<ReportRow[]>(existing?.rows ?? []);
  const [busy, setBusy] = useState(false);

  const names = useMemo(
    () => contractors.map((c) => c.name).filter(Boolean),
    [contractors],
  );
  const defaultContractor = names[0] ?? '';
  const stats = statsOf(rows);

  const addRow = () =>
    setRows((p) => [
      ...p,
      {
        ...EMPTY_ROW,
        id: rid(),
        contractor: defaultContractor,
        place: object.title,
        inspector: profile.fio,
        issuedAt: date,
      },
    ]);

  const carryOver = useMemo(() => {
    const present = new Set(
      rows.map((r) => `${r.orderNo.trim().toLowerCase()}|${r.point}`),
    );
    return buildArchive(items.filter((r) => r.id !== existing?.id))
      .filter((r) => r.status !== 'Устранено')
      .filter((r) => !present.has(`${r.orderNo.trim().toLowerCase()}|${r.point}`));
  }, [items, rows, existing?.id]);

  const pullCarryOver = () => {
    setRows((p) => [
      ...p,
      ...carryOver.map((r) => ({
        ...(r as ReportRow),
        id: rid(),
        inspector: r.inspector || profile.fio,
      })),
    ]);
    toast({
      title: `Перенесено предписаний: ${carryOver.length}`,
      description: 'Ранее выданные и не устранённые',
    });
  };

  const patch = (id: string, part: Partial<ReportRow>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...part } : r)));

  const drop = (id: string) => setRows((p) => p.filter((r) => r.id !== id));

  const store = async (andDownload: boolean) => {
    if (busy) return;
    if (rows.length === 0) {
      toast({ title: 'Добавьте хотя бы одну строку', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const item = await save({
        id: existing?.id,
        date,
        note,
        author: profile.fio,
        rows,
      });
      toast({ title: 'Отчёт сохранён', description: new Date(date).toLocaleDateString('ru') });
      if (andDownload) downloadDailyReport(item, object.title, object.field);
      onBack();
    } catch {
      toast({ title: 'Не удалось сохранить отчёт', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />К ежедневным отчётам
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Ежедневный отчёт по предписаниям
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {object.title}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            {object.field || 'без месторождения'} · {object.regionName || 'регион не указан'}
          </p>
        </section>

        <Panel title="Шапка отчёта">
          <div className="grid gap-3 p-3.5 sm:grid-cols-2">
            <Field label="Дата отчёта">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-sm"
              />
            </Field>
            <Field label="Инженер строительного контроля">
              <Input value={profile.fio} disabled className="rounded-sm" />
            </Field>
            <Field label="Примечание к отчёту" wide>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="необязательно"
                className="rounded-sm"
              />
            </Field>
          </div>
        </Panel>

        {carryOver.length > 0 && (
          <Panel title="Архив предписаний">
            <div className="flex flex-col gap-2.5 p-3.5">
              <p className="text-[0.83em] leading-snug text-muted-foreground">
                В архиве объекта {carryOver.length} ранее выданных и не устранённых предписаний.
                Их можно перенести в отчёт одной кнопкой — все поля подставятся, останется
                обновить статус и даты.
              </p>
              <Button
                type="button"
                onClick={pullCarryOver}
                variant="outline"
                className="w-full rounded-sm font-head uppercase tracking-[0.06em]"
              >
                <Icon name="History" fallback="Clock" size={15} className="mr-1.5 text-accent" />
                Подгрузить из архива ({carryOver.length})
              </Button>
            </div>
          </Panel>
        )}

        <Panel title="Сводка" note={`${rows.length} строк`}>
          <div className="grid grid-cols-3 gap-px bg-border sm:grid-cols-6">
            {[
              ['Выдано', stats.issued],
              ['С остановкой', stats.stop],
              ['Устранено', stats.fixed],
              ['В срок', stats.inTime],
              ['Не устранено', stats.open],
              ['Срок истёк', stats.overdue],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-card px-3 py-2.5 text-center">
                <p className="font-head text-[1.4em] text-accent">{value}</p>
                <p className="text-[0.68em] uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Предписания"
          note={`${rows.length}`}
         
          action={
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-[0.75em] uppercase tracking-[0.07em] transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
            >
              <Icon name="Plus" size={13} />
              Строка
            </button>
          }
        >
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Icon name="ClipboardList" size={26} className="mx-auto text-muted-foreground/50" />
              <p className="mt-2 font-head text-[0.95em] uppercase tracking-[0.03em]">
                Строк пока нет
              </p>
              <p className="mt-1 text-[0.8em] text-muted-foreground">
                Нажмите «Строка» — объект и подрядчик подставятся автоматически.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-px bg-border">
              {rows.map((r, i) => (
                <div key={r.id} className="bg-card p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-head text-[0.85em] uppercase tracking-[0.06em] text-accent">
                      Предписание {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => drop(r.id)}
                      className="flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-[0.72em] uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                    >
                      <Icon name="Trash2" size={12} />
                      Удалить
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Подрядная организация">
                      {names.length > 0 ? (
                        <select
                          value={r.contractor}
                          onChange={(e) => patch(r.id, { contractor: e.target.value })}
                          className="h-10 w-full rounded-sm border border-input bg-background px-3 text-[0.9em]"
                        >
                          <option value="">— выберите —</option>
                          {names.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={r.contractor}
                          onChange={(e) => patch(r.id, { contractor: e.target.value })}
                          placeholder="название организации"
                          className="rounded-sm"
                        />
                      )}
                    </Field>
                    <Field label="Наименование объекта и местоположение">
                      <Input
                        value={r.place}
                        onChange={(e) => patch(r.id, { place: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Содержание замечания" wide>
                      <Textarea
                        value={r.content}
                        onChange={(e) => patch(r.id, { content: e.target.value })}
                        rows={3}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Нормативный документ и пункт">
                      <Input
                        value={r.normRef}
                        onChange={(e) => patch(r.id, { normRef: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Ссылка на проектную документацию">
                      <Input
                        value={r.docRef}
                        onChange={(e) => patch(r.id, { docRef: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="№ предписания">
                      <Input
                        value={r.orderNo}
                        onChange={(e) => patch(r.id, { orderNo: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Кол. пункт">
                      <Input
                        type="number"
                        min={1}
                        value={r.point}
                        onChange={(e) => patch(r.id, { point: Number(e.target.value) || 1 })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Дата выдачи">
                      <Input
                        type="date"
                        value={r.issuedAt}
                        onChange={(e) => patch(r.id, { issuedAt: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Срок устранения">
                      <Input
                        type="date"
                        value={r.dueAt}
                        onChange={(e) => patch(r.id, { dueAt: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Факт устранения">
                      <Input
                        type="date"
                        value={r.factAt}
                        onChange={(e) => patch(r.id, { factAt: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Отметка о выполнении">
                      <select
                        value={r.status}
                        onChange={(e) =>
                          patch(r.id, { status: e.target.value as ReportRow['status'] })
                        }
                        className="h-10 w-full rounded-sm border border-input bg-background px-3 text-[0.9em]"
                      >
                        <option>Не устранено</option>
                        <option>Устранено</option>
                      </select>
                    </Field>
                    <Field label="№ и дата письма о продлении" wide>
                      <Input
                        value={r.extension}
                        onChange={(e) => patch(r.id, { extension: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Ответственный за проведение работ">
                      <Input
                        value={r.responsible}
                        onChange={(e) => patch(r.id, { responsible: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="ФИО инженера СК">
                      <Input
                        value={r.inspector}
                        onChange={(e) => patch(r.id, { inspector: e.target.value })}
                        className="rounded-sm"
                      />
                    </Field>
                    <Field label="Характер предписания">
                      <select
                        value={r.nature}
                        onChange={(e) =>
                          patch(r.id, { nature: e.target.value as ReportRow['nature'] })
                        }
                        className="h-10 w-full rounded-sm border border-input bg-background px-3 text-[0.9em]"
                      >
                        <option value="">— не выбрано —</option>
                        {NATURE.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Категория нарушения">
                      <select
                        value={r.category}
                        onChange={(e) =>
                          patch(r.id, { category: e.target.value as ReportRow['category'] })
                        }
                        className="h-10 w-full rounded-sm border border-input bg-background px-3 text-[0.9em]"
                      >
                        <option value="">— не выбрано —</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Photos
                      objectId={object.id}
                      urls={r.photos ?? []}
                      onChange={(photos) => patch(r.id, { photos })}
                    />
                    <label className="flex items-center gap-2 text-[0.85em] sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={r.stopWork}
                        onChange={(e) => patch(r.id, { stopWork: e.target.checked })}
                        className="h-4 w-4 accent-[hsl(var(--accent))]"
                      />
                      Предписание с остановкой работ
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="flex flex-none flex-wrap gap-2 pb-2">
          <Button
            onClick={() => store(false)}
            disabled={busy}
            className="flex-1 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="Save" size={15} className="mr-1.5" />
            Сохранить
          </Button>
          <Button
            onClick={() => store(true)}
            disabled={busy}
            variant="outline"
            className="flex-1 rounded-sm font-head uppercase tracking-[0.06em]"
          >
            <Icon name="Download" size={15} className="mr-1.5" />
            Сохранить и выгрузить
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DailyReportForm;