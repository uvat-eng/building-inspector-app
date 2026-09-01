import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { ProjectObject, STATUS_LABEL } from '@/data/store';

export type ObjectMenuId =
  | 'docs'
  | 'contract'
  | 'orders'
  | 'company'
  | 'inspections'
  | 'tests'
  | 'ks'
  | 'incoming'
  | 'pos'
  | 'journal'
  | 'staff';

interface MenuItem {
  id: ObjectMenuId;
  icon: string;
  label: string;
  note: string;
  ready: boolean;
}

const ITEMS: MenuItem[] = [
  {
    id: 'docs',
    icon: 'FolderOpen',
    label: 'Проектная документация',
    note: 'Проект, рабочая документация, генплан',
    ready: true,
  },
  {
    id: 'contract',
    icon: 'FileBadge',
    label: 'Договор строительства',
    note: 'Договор объекта в формате PDF',
    ready: true,
  },
  {
    id: 'inspections',
    icon: 'ClipboardCheck',
    label: 'Проверки объекта',
    note: 'Новый осмотр и реестр осмотров',
    ready: true,
  },
  {
    id: 'orders',
    icon: 'FileWarning',
    label: 'Предписания',
    note: 'Сквозной перечень выданных предписаний',
    ready: true,
  },
  {
    id: 'company',
    icon: 'Landmark',
    label: 'Карточка предприятия',
    note: 'Генподрядчик и субподрядные организации',
    ready: true,
  },
  {
    id: 'tests',
    icon: 'FileSignature',
    label: 'Подписанные акты испытаний',
    note: 'И иные важные документы, по месяцам',
    ready: true,
  },
  {
    id: 'ks',
    icon: 'FileSpreadsheet',
    label: 'Подписанные акты КС-2',
    note: 'КС-2, КС-3, КС-6, КС-11 по месяцам',
    ready: true,
  },
  {
    id: 'incoming',
    icon: 'Package',
    label: 'Акты входного контроля',
    note: 'И подписанные формы М-19, М-29',
    ready: true,
  },
  {
    id: 'pos',
    icon: 'BookMarked',
    label: 'ПОС и ППР',
    note: 'Загрузка вручную инспектором',
    ready: true,
  },
  {
    id: 'journal',
    icon: 'BookOpen',
    label: 'Общий журнал работ',
    note: 'Записи по форме КС-6',
    ready: false,
  },
  {
    id: 'staff',
    icon: 'Users',
    label: 'Персонал на объекте',
    note: 'Инспекторы и подрядные организации',
    ready: false,
  },
];

interface ObjectMenuProps {
  object: ProjectObject;
  onBack: () => void;
  onOpen: (id: ObjectMenuId) => void;
}

const ObjectMenu = ({ object, onBack, onOpen }: ObjectMenuProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-2.5">
    <button
      type="button"
      onClick={onBack}
      className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
    >
      <Icon name="ArrowLeft" size={14} className="text-accent" />
      К списку объектов
    </button>

    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4 sm:px-6 sm:py-5">
        <h1 className="font-head text-[18px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[26px]">
          {object.title}
        </h1>
        <p className="mt-1.5 text-[0.88em] text-muted-foreground">
          {object.regionName} · {object.field || 'без месторождения'}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Tag tone={object.status === 'risk' ? 'hot' : object.status === 'done' ? 'ok' : 'wait'}>
            {STATUS_LABEL[object.status]}
          </Tag>
          <Tag tone="dim">{object.stage}</Tag>
          <Tag tone="dim">Готовность {object.progress}%</Tag>
        </div>
      </section>

      <Panel title="Разделы объекта" note={`${ITEMS.filter((i) => i.ready).length} доступно`}>
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {ITEMS.map((it) => (
            <button
              key={it.id}
              type="button"
              disabled={!it.ready}
              onClick={() => onOpen(it.id)}
              className="group flex items-center gap-3 bg-card px-4 py-3.5 text-left transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-card disabled:hover:text-foreground"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon name={it.icon} fallback="Folder" size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[0.98em] uppercase tracking-[0.03em]">
                  {it.label}
                </span>
                <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                  {it.ready ? it.note : 'В разработке'}
                </span>
              </span>
              <Icon name="ChevronRight" size={18} className="flex-none opacity-40" />
            </button>
          ))}
        </div>
      </Panel>
    </div>
  </div>
);

export default ObjectMenu;