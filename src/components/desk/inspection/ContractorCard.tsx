import { useEffect, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ProjectObject } from '@/data/store';
import { useProfile } from '@/data/profile';
import { useContractor, Contractor, EMPTY_CONTRACTOR } from '@/data/orders';

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
];

const ContractorCard = ({ object, onBack }: ContractorCardProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { contractor, loading, save } = useContractor(object.id);
  const [form, setForm] = useState<Contractor>(EMPTY_CONTRACTOR);
  const [busy, setBusy] = useState(false);

  const canEdit = ['pm', 'coordinator', 'director'].includes(profile.role);

  useEffect(() => {
    if (contractor) setForm(contractor);
  }, [contractor]);

  const submit = async () => {
    setBusy(true);
    try {
      await save(form);
      toast({ title: 'Карточка сохранена' });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
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
        <Icon name="ArrowLeft" size={14} className="text-accent" />
        К меню объекта
      </button>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <section className="flex-none rounded-sm border border-border border-t-2 border-t-accent bg-card px-4 py-4">
          <p className="text-[0.72em] uppercase tracking-[0.14em] text-muted-foreground">
            Карточка предприятия
          </p>
          <h1 className="mt-1 font-head text-[17px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[22px]">
            {object.title}
          </h1>
          <p className="mt-1.5 text-[0.82em] text-muted-foreground">
            {canEdit
              ? 'Данные подтягиваются в предписания автоматически.'
              : 'Заполняет менеджер проекта. Используется в предписаниях.'}
          </p>
        </section>

        <Panel title="Подрядная организация" note={loading ? 'загрузка' : ''}>
          <div className="space-y-3 px-4 py-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-[0.7em] uppercase tracking-[0.1em] text-muted-foreground">
                  {f.label}
                </Label>
                {canEdit ? (
                  <Input
                    value={form[f.key] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="h-9 rounded-sm"
                  />
                ) : (
                  <p className="text-[0.9em]">{(form[f.key] as string) || '—'}</p>
                )}
              </div>
            ))}

            {canEdit && (
              <Button
                onClick={submit}
                disabled={busy}
                className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon
                  name={busy ? 'Loader2' : 'Save'}
                  size={16}
                  className={busy ? 'animate-spin' : ''}
                />
                Сохранить карточку
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default ContractorCard;
