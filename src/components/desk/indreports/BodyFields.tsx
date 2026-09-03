import { useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { compressPhoto } from '@/data/photoQueue';
import RowsEditor from '@/components/desk/indreports/RowsEditor';
import { IndReportData, IndReportKind } from '@/data/indreports';

interface BodyFieldsProps {
  kind: IndReportKind;
  data: IndReportData;
  set: (patch: Partial<IndReportData>) => void;
}

const BodyFields = ({ kind, data, set }: BodyFieldsProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const photos = data.photos ?? [];

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const out: { url: string; caption: string }[] = [];
      for (const f of Array.from(files))
        out.push({ url: await compressPhoto(f, 1600, 0.72), caption: '' });
      set({ photos: [...photos, ...out] });
    } catch {
      toast({ title: 'Не удалось прочитать фото', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <section className="rounded-sm border border-border bg-card">
        <h2 className="border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
          Результат контроля и вывод
        </h2>
        <div className="grid gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
              Описание действий
            </Label>
            <Textarea
              value={data.actions ?? ''}
              onChange={(e) => set({ actions: e.target.value })}
              rows={6}
              placeholder={
                'Проведен контроль качества выполняемых работ.\n' +
                'Проверено соблюдение технологии выполнения работ.\n' +
                '1. Наличие разрешительной документации…'
              }
              className="resize-none rounded-sm text-[0.88em]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Участок, ПК
              </Label>
              <Input
                value={data.area ?? ''}
                onChange={(e) => set({ area: e.target.value })}
                placeholder="Куст скважин № 19"
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Ссылка (шифр, нормативы)
              </Label>
              <Textarea
                value={data.reference ?? ''}
                onChange={(e) => set({ reference: e.target.value })}
                rows={2}
                placeholder={'МЯФ1-ОКП.2509-Р19-000-ЭМ01\nСП 48.13330.2011'}
                className="resize-none rounded-sm text-[0.88em]"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3">
        <RowsEditor
          title="Наряд-допуски"
          columns={[
            { key: 'number', label: '№' },
            { key: 'work', label: 'Вид работ', placeholder: 'Высота' },
            { key: 'start', label: 'Начало', placeholder: '01.09.2026' },
            { key: 'end', label: 'Окончание', placeholder: '13.09.2026' },
            { key: 'responsible', label: 'Ответственный ИТР', width: 'full' },
          ]}
          rows={data.permits ?? []}
          empty={{ number: '', start: '', end: '', work: '', responsible: '' }}
          addLabel="Добавить наряд-допуск"
          onChange={(permits) => set({ permits })}
        />

        <section className="rounded-sm border border-border bg-card">
          <h2 className="border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
            Заключение о готовности
          </h2>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Дата выдачи
              </Label>
              <Input
                value={data.zogDate ?? ''}
                onChange={(e) => set({ zogDate: e.target.value })}
                placeholder="29.06.2026"
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Статус ЗоГ
              </Label>
              <Input
                value={data.zogStatus ?? ''}
                onChange={(e) => set({ zogStatus: e.target.value })}
                placeholder="готов"
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                Примечание
              </Label>
              <Input
                value={data.zogNote ?? ''}
                onChange={(e) => set({ zogNote: e.target.value })}
                className="h-9 rounded-sm text-[0.88em]"
              />
            </div>
          </div>
        </section>

        <RowsEditor
          title="Объём выполненных работ"
          columns={[
            { key: 'name', label: 'Наименование', width: 'full' },
            { key: 'unit', label: 'Ед. изм.', placeholder: 'шт.' },
            { key: 'qty', label: 'Количество', placeholder: '2' },
          ]}
          rows={data.volumes ?? []}
          empty={{ name: '', unit: '', qty: '' }}
          addLabel="Добавить объём"
          onChange={(volumes) => set({ volumes })}
        />

        <RowsEditor
          title="Информация по ТК, ППР"
          columns={[
            { key: 'code', label: 'Шифр', placeholder: 'ППР-2026-МНГ-СМТ2-15' },
            { key: 'status', label: 'Статус', placeholder: 'Согласовано' },
            { key: 'name', label: 'Наименование', width: 'full' },
          ]}
          rows={data.docs ?? []}
          empty={{ code: '', name: '', status: '' }}
          addLabel="Добавить документ"
          onChange={(docs) => set({ docs })}
        />

        {kind === 'otpb' && (
          <>
            <RowsEditor
              title="Привлечённый персонал"
              columns={[
                { key: 'name', label: 'Специальность', placeholder: 'Эл. монтажник' },
                { key: 'qty', label: 'Количество', placeholder: '5 чел.' },
              ]}
              rows={data.staff ?? []}
              empty={{ name: '', qty: '' }}
              addLabel="Добавить специальность"
              onChange={(staff) => set({ staff })}
            />
            <RowsEditor
              title="Привлечённая техника"
              columns={[
                { key: 'name', label: 'Техника', placeholder: 'Вахтовый автомобиль' },
                { key: 'qty', label: 'Количество', placeholder: '1 ед.' },
              ]}
              rows={data.machines ?? []}
              empty={{ name: '', qty: '' }}
              addLabel="Добавить технику"
              onChange={(machines) => set({ machines })}
            />
          </>
        )}

        {kind === 'geodeziya' && (
          <RowsEditor
            title="Оборудование и поверки"
            columns={[
              { key: 'name', label: 'Тип оборудования', width: 'full' },
              { key: 'serial', label: 'Серийный номер', placeholder: '34811337' },
              { key: 'verification', label: 'Свидетельство о поверке' },
            ]}
            rows={data.equipment ?? []}
            empty={{ name: '', serial: '', verification: '' }}
            addLabel="Добавить оборудование"
            onChange={(equipment) => set({ equipment })}
          />
        )}
      </div>

      <section className="rounded-sm border border-border bg-card">
        <h2 className="flex items-center gap-3 border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
          Фотоотчёт
          <span className="ml-auto font-body normal-case tracking-normal text-muted-foreground">
            {photos.length}
          </span>
        </h2>

        <div className="p-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-input py-2.5 text-[0.85em] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Icon
              name={busy ? 'Loader2' : 'Camera'}
              size={16}
              className={busy ? 'animate-spin' : 'text-accent'}
            />
            Добавить фотографии
          </button>

          {photos.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {photos.map((p, i) => (
                <div key={i} className="rounded-sm border border-border p-2">
                  <div className="relative">
                    <img
                      src={p.url}
                      alt={`снимок ${i + 1}`}
                      className="aspect-[4/3] w-full rounded-sm object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => set({ photos: photos.filter((_, k) => k !== i) })}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </div>
                  <Input
                    value={p.caption}
                    onChange={(e) =>
                      set({
                        photos: photos.map((x, k) =>
                          k === i ? { ...x, caption: e.target.value } : x,
                        ),
                      })
                    }
                    placeholder="Подпись под фото"
                    className="mt-2 h-9 rounded-sm text-[0.86em]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => addPhotos(e.target.files)}
        />
      </section>

      <section className="rounded-sm border border-border bg-card">
        <h2 className="border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
          Вывод инспектора
        </h2>
        <div className="p-4">
          <Textarea
            value={data.conclusion ?? ''}
            onChange={(e) => set({ conclusion: e.target.value })}
            rows={3}
            placeholder="Работы выполняются в соответствии с проектной документацией…"
            className="resize-none rounded-sm text-[0.88em]"
          />
        </div>
      </section>
    </>
  );
};

export default BodyFields;
