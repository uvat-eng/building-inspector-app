import { useEffect, useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Row from '@/components/desk/Row';
import Tag from '@/components/desk/Tag';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import RussiaMap from '@/components/desk/RussiaMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useObjects, money, ProjectObject, STATUS_LABEL, KIND_LABEL } from '@/data/store';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import { CITIES } from '@/data/geo';
import type { TagTone } from '@/data/mock';

const TONE: Record<ProjectObject['status'], TagTone> = {
  work: 'hot',
  plan: 'wait',
  done: 'ok',
  risk: 'hot',
};

const TABS = [
  { id: 'info', label: 'Паспорт объекта', icon: 'FileText' },
  { id: 'resources', label: 'Персонал и техника', icon: 'Users' },
  { id: 'defects', label: 'Замечания', icon: 'TriangleAlert' },
  { id: 'docs', label: 'Документы', icon: 'FileSignature' },
] as const;

interface ObjectPageProps {
  id: string;
  editOnOpen?: boolean;
  onBack: () => void;
}

const km = (aLon: number, aLat: number, bLon: number, bLat: number) => {
  const dx = (aLon - bLon) * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180)) * 111;
  const dy = (aLat - bLat) * 111;
  return Math.sqrt(dx * dx + dy * dy);
};

const ObjectPage = ({ id, editOnOpen = false, onBack }: ObjectPageProps) => {
  const { list, update, remove } = useObjects();
  const { profile, canAddObject } = useProfile();
  const { toast } = useToast();
  const object = list.find((o) => o.id === id) ?? null;

  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('info');
  const [edit, setEdit] = useState(editOnOpen);
  const [draft, setDraft] = useState<ProjectObject | null>(object);

  useEffect(() => {
    setDraft(object);
  }, [object]);

  const near = useMemo(() => {
    if (!object) return [];
    return CITIES.map((c) => ({ ...c, km: km(object.lon, object.lat, c.lon, c.lat) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 3);
  }, [object]);

  if (!object || !draft) {
    return (
      <Panel title="Объект не найден" className="flex-none">
        <Empty icon="Building2" title="Объект удалён или недоступен" />
      </Panel>
    );
  }

  const startEdit = () => {
    if (!canAddObject) {
      toast({
        title: 'Недостаточно прав',
        description: `Корректировать данные объекта может только заместитель директора заказчика. Ваша роль: ${ROLE_LABEL[profile.role]}.`,
        variant: 'destructive',
      });
      return;
    }
    setDraft(object);
    setEdit(true);
    setTab('info');
  };

  const save = async () => {
    setEdit(false);
    try {
      await update(object.id, draft);
      toast({ title: 'Изменения сохранены', description: 'Данные обновлены на сервере.' });
    } catch {
      toast({
        title: 'Не удалось сохранить на сервере',
        description: 'Проверьте соединение и повторите.',
        variant: 'destructive',
      });
    }
  };

  const num = (v: string) => Number(v.replace(/\s/g, '')) || 0;

  const text = (
    key: keyof ProjectObject,
    label: string,
    props: Record<string, unknown> = {},
    numeric = false,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      {edit ? (
        <Input
          value={String(draft[key] ?? '')}
          onChange={(e) =>
            setDraft({ ...draft, [key]: numeric ? num(e.target.value) : e.target.value })
          }
          className="rounded-sm"
          {...props}
        />
      ) : (
        <div className="rounded-sm border border-transparent px-1 py-2 text-[0.95em]">
          {String(object[key] ?? '') || '—'}
        </div>
      )}
    </div>
  );

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-0.5">
      <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-9 rounded-sm px-2 text-muted-foreground"
        >
          <Icon name="ArrowLeft" size={16} className="mr-1.5" />
          Назад
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-head text-xl uppercase tracking-[0.03em]">{object.title}</h2>
          <p className="truncate text-[0.85em] text-muted-foreground">
            {object.customer} · {object.regionName}
          </p>
        </div>
        <Tag tone={TONE[object.status]}>{STATUS_LABEL[object.status]}</Tag>
        {edit ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-sm"
              onClick={() => {
                setDraft(object);
                setEdit(false);
              }}
            >
              Отмена
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              onClick={save}
            >
              <Icon name="Check" size={15} className="mr-1.5" />
              Сохранить
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={startEdit}
            className={`h-9 gap-1.5 rounded-sm font-head text-[0.85em] uppercase tracking-[0.06em] ${
              canAddObject
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-secondary text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Icon name={canAddObject ? 'Pencil' : 'Lock'} size={14} />
            Корректировать
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-2 text-[0.85em] uppercase tracking-[0.06em] transition-colors ${
              tab === t.id
                ? 'bg-accent text-accent-foreground'
                : 'bg-card text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid gap-3.5 lg:grid-cols-[1.15fr_1fr]">
          <Panel title="Паспорт объекта" note={edit ? 'режим правки' : 'просмотр'}>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">{text('field', 'Месторождение')}</div>
              <div className="sm:col-span-2">{text('title', 'Название объекта')}</div>

              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Тип объекта
                </Label>
                {edit ? (
                  <Select
                    value={draft.kind}
                    onValueChange={(v) => setDraft({ ...draft, kind: v as ProjectObject['kind'] })}
                  >
                    <SelectTrigger className="rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(KIND_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-1 py-2 text-[0.95em]">
                    {KIND_LABEL[object.kind ?? 'area']}
                  </div>
                )}
              </div>
              {text(
                'capacity',
                object.kind === 'line' ? 'Протяжённость' : 'Мощность / производительность',
              )}
              {text('startYear', 'Год начала строительства', { inputMode: 'numeric' })}
              {text('endYear', 'Плановый год завершения', { inputMode: 'numeric' })}
              {text('customer', 'Заказчик')}
              {text('customerLogo', 'Эмблема заказчика (ссылка)')}
              <div className="sm:col-span-2">{text('regionName', 'Адрес / привязка на местности')}</div>
              {text('contractNo', 'Номер договора')}
              {text('contractSum', 'Сумма договора, ₽', { inputMode: 'numeric' }, true)}
              {text('stage', 'Текущий этап работ')}
              {text('progress', 'Готовность, %', { inputMode: 'numeric' }, true)}
              {text('start', 'Начало работ', { type: 'date' })}
              {text('deadline', 'Срок по договору', { type: 'date' })}

              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Статус
                </Label>
                {edit ? (
                  <Select
                    value={draft.status}
                    onValueChange={(v) => setDraft({ ...draft, status: v as ProjectObject['status'] })}
                  >
                    <SelectTrigger className="rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="px-1 py-2 text-[0.95em]">{STATUS_LABEL[object.status]}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Сумма договора
                </Label>
                <div className="px-1 py-2 font-head text-lg">{money(object.contractSum)}</div>
              </div>
            </div>

            <div className="border-t border-border p-4">
              <div className="mb-1.5 flex items-center justify-between text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
                <span>Готовность</span>
                <span className="text-accent">{object.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-sm bg-secondary">
                <div
                  className="h-2 rounded-sm bg-accent transition-all duration-700"
                  style={{ width: `${Math.min(100, object.progress)}%` }}
                />
              </div>
            </div>

            {canAddObject && !edit && (
              <div className="border-t border-border p-4">
                <Button
                  variant="ghost"
                  className="rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    remove(object.id);
                    onBack();
                  }}
                >
                  <Icon name="Trash2" size={15} className="mr-1.5" />
                  Удалить объект
                </Button>
              </div>
            )}
          </Panel>

          <Panel title="Расположение" note={`${object.lat.toFixed(3)}°, ${object.lon.toFixed(3)}°`}>
            <RussiaMap
              objects={[object]}
              focusDistrict={object.district}
              marker={edit ? { lon: draft.lon, lat: draft.lat } : null}
              pickMode={edit}
              onPoint={(lon, lat) =>
                setDraft({ ...draft, lon: Number(lon.toFixed(4)), lat: Number(lat.toFixed(4)) })
              }
              height="max-h-[34vh]"
            />
            <div className="p-4 text-[0.88em] text-muted-foreground">
              {edit && (
                <p className="mb-2 text-foreground">
                  Коснитесь карты, чтобы перенести объект в другую точку.
                </p>
              )}
              Ближайшие города:{' '}
              {near.map((c, i) => (
                <span key={c.n}>
                  {i > 0 && ', '}
                  {c.n} — {Math.round(c.km)} км
                </span>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'resources' && (
        <div className="grid gap-3.5 lg:grid-cols-2">
          <Panel title="Персонал на объекте" note="план / факт">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {text('staffPlan', 'Персонал, план', { inputMode: 'numeric' }, true)}
              {text('staffFact', 'Персонал, факт', { inputMode: 'numeric' }, true)}
              {text('inspectors', 'Инспекторов на объекте', { inputMode: 'numeric' }, true)}
              {text('cabins', 'Вагонов (жильё)', { inputMode: 'numeric' }, true)}
            </div>
            <div className="border-t border-border p-4 text-[0.88em] text-muted-foreground">
              {object.staffFact < object.staffPlan
                ? `Недобор ${object.staffPlan - object.staffFact} чел. — отражается в сводке на главной.`
                : 'Численность соответствует плану.'}
            </div>
          </Panel>

          <Panel title="Техника на объекте" note="план / факт">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {text('techPlan', 'Техника, план', { inputMode: 'numeric' }, true)}
              {text('techFact', 'Техника, факт', { inputMode: 'numeric' }, true)}
              {text('vehicles', 'Единиц техники в работе', { inputMode: 'numeric' }, true)}
            </div>
            <div className="border-t border-border p-4 text-[0.88em] text-muted-foreground">
              {object.techFact < object.techPlan
                ? `Не хватает ${object.techPlan - object.techFact} ед. техники.`
                : 'Техника укомплектована по плану.'}
            </div>
          </Panel>
        </div>
      )}

      {tab === 'defects' && (
        <div className="grid gap-3.5 lg:grid-cols-2">
          <Panel title="Предписания и замечания" note="накопитель по объекту">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {text('orders', 'Выдано предписаний', { inputMode: 'numeric' }, true)}
              {text('ordersOpen', 'Из них не устранено', { inputMode: 'numeric' }, true)}
            </div>
            <div className="border-t border-border p-4 text-[0.88em] text-muted-foreground">
              Устранено {Math.max(0, object.orders - object.ordersOpen)} из {object.orders}.
            </div>
          </Panel>

          <Panel title="Журнал замечаний" note="по этому объекту">
            <Empty
              icon="TriangleAlert"
              title="Замечаний ещё нет"
              hint="Замечания появятся здесь после выездов инспекторов на объект."
            />
          </Panel>
        </div>
      )}

      {tab === 'docs' && (
        <div className="grid gap-3.5 lg:grid-cols-2">
          <Panel title="Договор" note={object.contractNo || 'без номера'}>
            <Row title="Сумма договора" sub="по условиям контракта" right={<span>{money(object.contractSum)}</span>} />
            <Row title="Начало работ" sub="по договору" right={<span>{object.start || '—'}</span>} />
            <Row title="Срок завершения" sub="по договору" right={<span>{object.deadline || '—'}</span>} />
          </Panel>

          <Panel title="Исполнительная документация" note="акты и фотоотчёты">
            <Empty
              icon="FileSignature"
              title="Документов нет"
              hint="Акты, схемы и фотоотчёты будут прикрепляться к объекту."
            />
          </Panel>
        </div>
      )}
    </div>
  );
};

export default ObjectPage;