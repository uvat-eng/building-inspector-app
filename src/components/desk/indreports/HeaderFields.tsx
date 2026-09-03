import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ProjectObject } from '@/data/store';
import { IndReportData, IndReportKind, KIND_META, KIND_LIST, STATUSES } from '@/data/indreports';

interface HeaderFieldsProps {
  objects: ProjectObject[];
  objectId: string;
  setObjectId: (v: string) => void;
  kind: IndReportKind;
  setKind: (v: IndReportKind) => void;
  number: string;
  setNumber: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  data: IndReportData;
  set: (patch: Partial<IndReportData>) => void;
}

const field = (
  label: string,
  value: string | undefined,
  onChange: (v: string) => void,
  placeholder?: string,
  full?: boolean,
) => (
  <div className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2')}>
    <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">{label}</Label>
    <Input
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 rounded-sm text-[0.88em]"
    />
  </div>
);

const HeaderFields = ({
  objects,
  objectId,
  setObjectId,
  kind,
  setKind,
  number,
  setNumber,
  date,
  setDate,
  data,
  set,
}: HeaderFieldsProps) => (
  <>
    <section className="rounded-sm border border-border border-t-2 border-t-accent bg-card">
      <h2 className="border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
        Вид отчёта
      </h2>
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {KIND_LIST.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'rounded-sm border px-3 py-2.5 text-left transition-colors',
              kind === k
                ? 'border-accent bg-accent/10'
                : 'border-border hover:border-accent hover:bg-secondary/60',
            )}
          >
            <span className="block font-head text-[0.88em] uppercase tracking-[0.03em]">
              {KIND_META[k].label}
            </span>
            <span className="mt-0.5 block text-[0.74em] leading-snug text-muted-foreground">
              {KIND_META[k].note}
            </span>
          </button>
        ))}
      </div>
    </section>

    <section className="rounded-sm border border-border bg-card">
      <h2 className="border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
        Шапка отчёта
      </h2>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
            Отчёт №
          </Label>
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="45"
            className="h-9 rounded-sm text-[0.88em]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
            Дата
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-sm text-[0.88em]"
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
            Объект
          </Label>
          <select
            value={objectId}
            onChange={(e) => setObjectId(e.target.value)}
            className="h-9 rounded-sm border border-border bg-card px-2 text-[0.88em]"
          >
            {objects.length === 0 && <option value="">Объекты не назначены</option>}
            {objects.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
            Наименование объекта в отчёте
          </Label>
          <Textarea
            value={data.objectTitle ?? ''}
            onChange={(e) => set({ objectTitle: e.target.value })}
            rows={2}
            placeholder="Обустройство Восточно-Мессояхского месторождения. Кустовая площадка № 19…"
            className="resize-none rounded-sm text-[0.88em]"
          />
        </div>

        {field('Направление контроля', data.direction, (v) => set({ direction: v }),
          'Электромонтажные работы', true)}
      </div>
    </section>

    <section className="rounded-sm border border-border bg-card">
      <h2 className="border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
        Данные заказчика и договор
      </h2>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {field('Название', data.customerName, (v) => set({ customerName: v }), 'АО «Мессояханефтегаз»')}
        {field('Номер договора', data.contractNo, (v) => set({ contractNo: v }), '№МСХ-25/11000/00304/Р')}
        {field('Адрес', data.customerAddress, (v) => set({ customerAddress: v }),
          'г. Тюмень, ул. Холодильная, 77')}
        {field('Дата договора', data.contractDate, (v) => set({ contractDate: v }), '11.11.2025')}
        {field('Вниманию / телефон', data.customerPhone, (v) => set({ customerPhone: v }),
          '8-952-673-14-30')}
        {field('Наряд-заказ', data.orderNo, (v) => set({ orderNo: v }), '1')}
        {field('E-mail', data.customerEmail, (v) => set({ customerEmail: v }),
          'AminovRRo@tmn.gazprom-neft.ru')}
        {field('Заявка №', data.requestNo, (v) => set({ requestNo: v }), '9')}
        {field('Руководитель', data.customerHead, (v) => set({ customerHead: v }),
          'Аминов Руслан Родионович', true)}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
            Копии
          </Label>
          <Textarea
            value={data.customerCopies ?? ''}
            onChange={(e) => set({ customerCopies: e.target.value })}
            rows={2}
            className="resize-none rounded-sm text-[0.88em]"
          />
        </div>
      </div>
    </section>

    <section className="rounded-sm border border-border bg-card">
      <h2 className="border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
        Подрядчик / субподрядчик
      </h2>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {field('Инспекция проведена', data.inspectionWith, (v) => set({ inspectionWith: v }),
          'С подрядчиком')}
        {field('Генподрядчик', data.generalContractor, (v) => set({ generalContractor: v }),
          'АО «Евракор»')}
        {field('Субподрядчик', data.subcontractor, (v) => set({ subcontractor: v }), '—')}
        {field('Договор подряда', data.contractorContract, (v) => set({ contractorContract: v }),
          'МСХ-23/11000/00222/Р от 27.07.2023')}
        {field('Контактное лицо', data.contactPerson, (v) => set({ contactPerson: v }),
          'Старший производитель работ …', true)}
        {field('Телефон', data.contactPhone, (v) => set({ contactPhone: v }), '+7 927 310-82-24')}
        {field('E-mail / доп. информация', data.contactEmail, (v) => set({ contactEmail: v }), '—')}
      </div>
    </section>

    <section className="rounded-sm border border-border bg-card">
      <h2 className="border-b border-border px-4 py-3 font-head text-[0.85em] uppercase tracking-[0.12em]">
        Статус строительного контроля
      </h2>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
            Статус
          </Label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ status: s })}
                className={cn(
                  'rounded-sm border px-2 py-2 text-[0.76em] transition-colors',
                  data.status === s
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-input hover:bg-secondary',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {field('Погодная характеристика', data.weather, (v) => set({ weather: v }),
          'Температура +9…+7 °С, ветер 9–6 м/с')}
        {field('Время ведения контроля', data.workTime, (v) => set({ workTime: v }),
          'с 08:00 до 20:00')}
        {field('Инспектор предыдущей смены', data.prevInspector, (v) => set({ prevInspector: v }),
          '—', true)}
      </div>
    </section>
  </>
);

export default HeaderFields;
