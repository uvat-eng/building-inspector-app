import { useEffect, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import Tag from '@/components/desk/Tag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ProjectObject } from '@/data/store';
import { useProfile } from '@/data/profile';
import { useContractor, Contractor, ContractorKind, EMPTY_CONTRACTOR } from '@/data/orders';

interface ContractorCardProps {
  object: ProjectObject;
  onBack: () => void;
}

const FIELDS: { key: keyof Contractor; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Наименование организации', placeholder: 'ООО «СтройМонтаж»' },
  { key: 'inn', label: 'ИНН / КПП', placeholder: '7701234567 / 770101001' },
  { key: 'address', label: 'Юридический адрес', placeholder: 'г. Тюмень, ул. ...' },
  { key: 'director', label: 'Руководитель', placeholder: 'Иванов Иван Иванович' },
  { key: 'phone', label: 'Телефон', placeholder: '+7 900 000-00-00' },
  { key: 'email', label: 'Электронная почта', placeholder: 'info@company.ru' },
  { key: 'works', label: 'Выполняемые работы', placeholder: 'Электромонтаж, КИПиА' },
];

const ContractorCard = ({ object, onBack }: ContractorCardProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { general, subs, loading, save, remove } = useContractor(object.id);

  const [edit, setEdit] = useState<Contractor | null>(null);
  const [form, setForm] = useState<Contractor>(EMPTY_CONTRACTOR);
  const [busy, setBusy] = useState(false);

  const canEdit = ['pm', 'coordinator', 'manager', 'director'].includes(profile.role);

  useEffect(() => {
    if (edit) setForm(edit);
  }, [edit]);

  const openNew = (kind: ContractorKind) =>
    setEdit({ ...EMPTY_CONTRACTOR, kind, objectId: object.id });

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Укажите наименование организации', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await save(form);
      toast({ title: 'Карточка сохранена' });
      setEdit(null);
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const card = (c: Contractor) => (
    <div key={c.id} className="border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground">
          <Icon name={c.kind === 'general' ? 'Building' : 'Hammer'} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-head text-[0.95em] uppercase tracking-[0.02em]">{c.name}</p>
          <p className="mt-0.5 truncate text-[0.76em] text-muted-foreground">
            {[c.inn && `ИНН ${c.inn}`, c.director, c.phone].filter(Boolean).join(' · ') ||
              'реквизиты не заполнены'}
          </p>
          {c.works && (
            <p className="mt-0.5 truncate text-[0.76em] text-muted-foreground">Работы: {c.works}</p>
          )}
        </div>
        <Tag tone={c.kind === 'general' ? 'ok' : 'dim'}>
          {c.kind === 'general' ? 'Генподряд' : 'Субподряд'}
        </Tag>
        {canEdit && (
          <>
            <button
              type="button"
              title="Редактировать"
              onClick={() => setEdit(c)}
              className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-border"
            >
              <Icon name="Pencil" size={15} />
            </button>
            {c.kind === 'sub' && (
              <button
                type="button"
                title="Удалить"
                onClick={() => remove(c.id)}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-sm bg-secondary transition-colors hover:bg-destructive hover:text-destructive-foreground"
              >
                <Icon name="X" size={15} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const addBtn = (kind: ContractorKind, label: string) =>
    canEdit ? (
      <button
        type="button"
        onClick={() => openNew(kind)}
        className="ml-3 flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] text-accent-foreground transition-colors hover:bg-accent/90"
      >
        <Icon name="Plus" size={14} />
        {label}
      </button>
    ) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-none items-center gap-1.5 rounded-sm border border-border bg-card px-2.5 py-1 text-[0.78em] uppercase tracking-[0.08em] transition-colors hover:border-accent hover:bg-secondary"
      >
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        К меню объекта
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Карточки предприятий
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {object.title}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            {canEdit
              ? 'Данные подтягиваются в осмотры и предписания автоматически.'
              : 'Заполняет менеджер проекта. Используются в осмотрах и предписаниях.'}
          </p>
        </section>

        <Panel
          title="Генеральный подрядчик"
          note={loading ? 'загрузка' : general ? '' : 'не заполнен'}
          action={!general ? addBtn('general', 'Добавить') : undefined}
        >
          {general ? (
            card(general)
          ) : (
            <Empty
              icon="Building"
              title="Генподрядчик не указан"
              hint={canEdit ? 'Нажмите «Добавить».' : 'Заполнит менеджер проекта.'}
            />
          )}
        </Panel>

        <Panel
          title="Субподрядные организации"
          note={`${subs.length}`}
          action={addBtn('sub', 'Добавить')}
        >
          {subs.length === 0 ? (
            <Empty
              icon="Hammer"
              title="Субподрядчиков нет"
              hint={canEdit ? 'Добавьте организации, выполняющие работы.' : 'Заполнит менеджер.'}
            />
          ) : (
            subs.map(card)
          )}
        </Panel>
      </div>

      <Dialog open={edit !== null} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              {form.kind === 'general' ? 'Генеральный подрядчик' : 'Субподрядная организация'}
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">{object.title}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                  {f.label}
                </Label>
                <Input
                  value={form[f.key] as string}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="h-9 rounded-sm"
                />
              </div>
            ))}
          </div>

          <Button
            onClick={submit}
            disabled={busy}
            className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name={busy ? 'Loader2' : 'Save'} size={16} className={busy ? 'animate-spin' : ''} />
            Сохранить карточку
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractorCard;
