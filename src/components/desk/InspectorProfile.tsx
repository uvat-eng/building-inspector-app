import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { SPECIALTIES, useProfile } from '@/data/profile';
import { User, updateUser, uid, Certificate, Education } from '@/data/users';

interface InspectorProfileProps {
  user: User;
}

const field = (
  label: string,
  value: string,
  onChange: (v: string) => void,
  placeholder?: string,
  type?: string,
) => (
  <div className="space-y-1">
    <Label className="text-[0.68em] uppercase tracking-[0.1em] text-muted-foreground">
      {label}
    </Label>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 rounded-sm"
    />
  </div>
);

const InspectorProfile = ({ user }: InspectorProfileProps) => {
  const { toast } = useToast();
  const { save } = useProfile();

  const [fio, setFio] = useState(user.fio);
  const [group, setGroup] = useState(user.group);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [spec, setSpec] = useState<string[]>(user.specialties ?? []);
  const [certs, setCerts] = useState<Certificate[]>(user.certificates ?? []);
  const [edus, setEdus] = useState<Education[]>(user.educations ?? []);
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [specOpen, setSpecOpen] = useState(false);

  const toggleSpec = (s: string) =>
    setSpec((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const addCert = () =>
    setCerts((p) => [...p, { id: uid(), number: '', issued: '', until: '', area: '' }]);
  const patchCert = (id: string, patch: Partial<Certificate>) =>
    setCerts((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCert = (id: string) => setCerts((p) => p.filter((c) => c.id !== id));

  const addEdu = () =>
    setEdus((p) => [...p, { id: uid(), institution: '', specialty: '', docNumber: '', year: '' }]);
  const patchEdu = (id: string, patch: Partial<Education>) =>
    setEdus((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEdu = (id: string) => setEdus((p) => p.filter((e) => e.id !== id));

  const submit = () => {
    if (!fio.trim()) {
      toast({ title: 'Укажите ФИО', variant: 'destructive' });
      return;
    }
    if (pass && pass.length < 4) {
      toast({ title: 'Пароль минимум 4 символа', variant: 'destructive' });
      return;
    }
    if (pass && pass !== pass2) {
      toast({ title: 'Пароли не совпадают', variant: 'destructive' });
      return;
    }
    updateUser(user.id, {
      fio: fio.trim(),
      group: group.trim(),
      phone: phone.trim(),
      specialties: spec,
      certificates: certs.filter((c) => c.number.trim()),
      educations: edus.filter((e) => e.institution.trim()),
      ...(pass ? { password: pass } : {}),
    });
    save({ fio: fio.trim(), group: group.trim(), specialties: spec });
    setPass('');
    setPass2('');
    toast({ title: 'Профиль сохранён' });
  };

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
      <Panel title="Личные данные">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {field('Фамилия, имя, отчество (логин)', fio, setFio)}
          {field('Проект / группа', group, setGroup, 'Якутия-Запад')}
          {field('Телефон', phone, setPhone, '+7 900 000-00-00')}
          <div className="space-y-1">
            <Label className="text-[0.68em] uppercase tracking-[0.1em] text-muted-foreground">
              Организация
            </Label>
            <Input value={user.org} disabled className="h-9 rounded-sm" />
          </div>
        </div>
      </Panel>

      <Panel title="Специализация" note={`${spec.length}`}>
        <div className="p-4">
          <button
            type="button"
            onClick={() => setSpecOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-sm border border-input px-3 py-2 text-left text-[0.9em]"
          >
            <span className={cn('min-w-0 flex-1 truncate', !spec.length && 'text-muted-foreground')}>
              {spec.length ? spec.join(', ') : 'Выберите одну или несколько'}
            </span>
            <Icon
              name="ChevronDown"
              size={16}
              className={cn('flex-none transition-transform', specOpen && 'rotate-180')}
            />
          </button>
          {specOpen && (
            <div className="mt-2 rounded-sm border border-input">
              {SPECIALTIES.map((s) => {
                const on = spec.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpec(s)}
                    className={cn(
                      'flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left text-[0.85em] last:border-b-0',
                      on ? 'bg-secondary' : 'hover:bg-secondary/60',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 flex-none items-center justify-center rounded-[3px] border',
                        on ? 'border-accent bg-accent text-accent-foreground' : 'border-input',
                      )}
                    >
                      {on && <Icon name="Check" size={11} />}
                    </span>
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Panel>

      <Panel title="Удостоверения и аттестации" note={`${certs.length}`}>
        <div className="space-y-2.5 p-4">
          {certs.map((c, i) => (
            <div key={c.id} className="rounded-sm border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-secondary font-head text-[0.75em]">
                  {i + 1}
                </span>
                <span className="text-[0.8em] uppercase tracking-[0.08em] text-muted-foreground">
                  Удостоверение
                </span>
                <button
                  type="button"
                  onClick={() => removeCert(c.id)}
                  className="ml-auto flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  <Icon name="X" size={15} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {field('Номер удостоверения', c.number, (v) => patchCert(c.id, { number: v }))}
                {field(
                  'Область аттестации / навык',
                  c.area,
                  (v) => patchCert(c.id, { area: v }),
                  'Контроль сварных соединений',
                )}
                {field('Дата выдачи', c.issued, (v) => patchCert(c.id, { issued: v }), '', 'date')}
                {field('Действует до', c.until, (v) => patchCert(c.id, { until: v }), '', 'date')}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addCert}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-input py-2 text-[0.85em] text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <Icon name="Plus" size={15} />
            Добавить удостоверение
          </button>
        </div>
      </Panel>

      <Panel title="Образование" note={`${edus.length}`}>
        <div className="space-y-2.5 p-4">
          {edus.map((e, i) => (
            <div key={e.id} className="rounded-sm border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-secondary font-head text-[0.75em]">
                  {i + 1}
                </span>
                <span className="text-[0.8em] uppercase tracking-[0.08em] text-muted-foreground">
                  Документ об образовании
                </span>
                <button
                  type="button"
                  onClick={() => removeEdu(e.id)}
                  className="ml-auto flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  <Icon name="X" size={15} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {field(
                  'Учебное заведение',
                  e.institution,
                  (v) => patchEdu(e.id, { institution: v }),
                  'ТИУ, Тюмень',
                )}
                {field(
                  'Присвоенная специальность',
                  e.specialty,
                  (v) => patchEdu(e.id, { specialty: v }),
                  'Промышленное и гражданское строительство',
                )}
                {field('Номер диплома', e.docNumber, (v) => patchEdu(e.id, { docNumber: v }))}
                {field('Год окончания', e.year, (v) => patchEdu(e.id, { year: v }), '2015')}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addEdu}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-input py-2 text-[0.85em] text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <Icon name="Plus" size={15} />
            Добавить документ
          </button>
        </div>
      </Panel>

      <Panel title="Смена пароля">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {field('Новый пароль', pass, setPass, 'Оставьте пустым, если не меняете', 'password')}
          {field('Повторите пароль', pass2, setPass2, '', 'password')}
        </div>
      </Panel>

      <Button
        onClick={submit}
        className="w-full flex-none gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon name="Save" size={16} />
        Сохранить профиль
      </Button>
    </div>
  );
};

export default InspectorProfile;
