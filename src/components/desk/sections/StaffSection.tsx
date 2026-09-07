import { useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useProfile,
  ROLE_LABEL,
  ROLE_ICON,
  ROLE_NOTE,
  ROLE_ORDER,
  CREATABLE_ROLES,
  isAdminProfile,
  Role,
  SPECIALTIES,
} from '@/data/profile';
import { useUsers, updateUser, removeUser, registerUser, User } from '@/data/users';
import { useLocations } from '@/data/locations';
import { useObjects } from '@/data/store';
import { useFields } from '@/data/fields';

const StaffSection = () => {
  const { profile, canManageUsers } = useProfile();
  const { users, current, reload } = useUsers();
  const { list: locations } = useLocations();
  const { list: objects } = useObjects();
  const { toast } = useToast();

  const [reset, setReset] = useState<User | null>(null);
  const [pass, setPass] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const [form, setForm] = useState(false);
  const [nFio, setNFio] = useState('');
  const [nRole, setNRole] = useState<Role>('inspector');
  const [nPhone, setNPhone] = useState('');
  const [nLocs, setNLocs] = useState<string[]>([]);
  const [nSpec, setNSpec] = useState<string[]>([]);
  const [nProject, setNProject] = useState('');
  const { list: fields } = useFields(nLocs.length === 1 ? nLocs[0] : undefined);
  const [busy, setBusy] = useState(false);

  const canManage = canManageUsers;
  const canAssign = ['manager', 'director', 'admin', 'pm'].includes(profile.role);
  const chiefs = users.filter((u: User) => u.role === 'engineer');
  const roleChoices = isAdminProfile(profile)
    ? ROLE_ORDER
    : ['manager', 'director', 'pm'].includes(profile.role)
      ? (['engineer', ...CREATABLE_ROLES] as typeof CREATABLE_ROLES)
      : CREATABLE_ROLES;

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const createUser = async () => {
    if (nFio.trim().split(/\s+/).length < 2) {
      toast({ title: 'Укажите фамилию, имя и отчество', variant: 'destructive' });
      return;
    }
    if ((nRole === 'driver' || nRole === 'mechanic') && !nProject.trim()) {
      toast({ title: 'Выберите проект', description: 'Путевые листы заполняются по проекту.', variant: 'destructive' });
      return;
    }
    if (nRole === 'inspector' && nLocs.length === 0) {
      toast({ title: 'Назначьте хотя бы одну локацию', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await registerUser(
        {
          fio: nFio.trim().replace(/\s+/g, ' '),
          password: '',
          role: nRole,
          group: nProject.trim(),
          org: profile.org,
          phone: nPhone.trim(),
          locations: nLocs,
          specialties: nSpec,
          certificates: [],
          educations: [],
        },
        current?.id,
      );
      toast({
        title: 'Учётная запись создана',
        description: `${nFio.trim()} — первый вход без пароля, система попросит задать свой.`,
      });
      setForm(false);
      setNFio('');
      setNPhone('');
      setNLocs([]);
      setNSpec([]);
      setNProject('');
      reload();
    } catch (e) {
      const c = (e as Error).message;
      toast({
        title:
          c === 'exists'
            ? 'Такой сотрудник уже есть'
            : c === 'not_allowed'
              ? 'Недостаточно прав'
              : 'Не удалось создать',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const setUserLocs = async (u: User, ids: string[]) => {
    await updateUser(u.id, { locations: ids });
    reload();
  };

  const setUserObjects = async (u: User, ids: string[]) => {
    await updateUser(u.id, { objects: ids });
    reload();
  };

  const setUserChief = async (u: User, fio: string) => {
    await updateUser(u.id, { chief: fio });
    reload();
  };

  const doReset = async () => {
    if (!reset) return;
    if (pass.length < 4) {
      toast({ title: 'Пароль минимум 4 символа', variant: 'destructive' });
      return;
    }
    try {
      await updateUser(reset.id, { password: pass, mustChangePassword: true });
      toast({
        title: 'Пароль сброшен',
        description: `${reset.fio} — выдайте пароль лично, сотрудник сменит его сам.`,
      });
      setReset(null);
      setPass('');
    } catch {
      toast({ title: 'Не удалось сбросить пароль', variant: 'destructive' });
    }
  };

  const inspectors = users.filter((u) => u.role === 'inspector');
  const others = users.filter((u) => u.role !== 'inspector');

  const card = (u: User) => (
    <div key={u.id} className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(open === u.id ? null : u.id)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60"
      >
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
          <Icon name={ROLE_ICON[u.role]} fallback="User" size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{u.fio}</span>
          <span className="block truncate text-[0.82em] text-muted-foreground">
            {ROLE_LABEL[u.role]}
            {u.group ? ` · ${u.group}` : ''}
            {u.phone ? ` · ${u.phone}` : ''}
          </span>
        </span>
        <Icon
          name="ChevronDown"
          size={16}
          className={cn('flex-none transition-transform', open === u.id && 'rotate-180')}
        />
      </button>

      {open === u.id && (
        <div className="space-y-3 border-t border-border/60 bg-secondary/30 px-4 py-3 text-[0.85em]">
          {!!u.specialties?.length && (
            <div>
              <span className="text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
                Специализация
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {u.specialties.map((s) => (
                  <span key={s} className="rounded-sm bg-card px-2 py-0.5 text-[0.9em]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
              Удостоверения ({u.certificates?.length ?? 0})
            </span>
            {u.certificates?.length ? (
              <ul className="mt-1 space-y-0.5">
                {u.certificates.map((c) => (
                  <li key={c.id}>
                    № {c.number} · {c.area || 'без области'}
                    {c.issued ? ` · выдано ${c.issued.split('-').reverse().join('.')}` : ''}
                    {c.until ? ` · до ${c.until.split('-').reverse().join('.')}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">Не внесены</p>
            )}
          </div>

          <div>
            <span className="text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
              Образование ({u.educations?.length ?? 0})
            </span>
            {u.educations?.length ? (
              <ul className="mt-1 space-y-0.5">
                {u.educations.map((e) => (
                  <li key={e.id}>
                    {e.institution} · {e.specialty}
                    {e.year ? ` · ${e.year}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted-foreground">Не внесено</p>
            )}
          </div>

          <div>
            <span className="text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
              Доступ к локациям ({u.locations?.length ? u.locations.length : 'все'})
            </span>
            {canManage ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {locations.map((l) => {
                  const on = u.locations?.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setUserLocs(u, toggle(u.locations ?? [], l.id))}
                      className={cn(
                        'flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.9em] transition-colors',
                        on
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input bg-card hover:bg-secondary',
                      )}
                    >
                      <Icon name={on ? 'Check' : l.icon} size={13} />
                      {l.title}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground">
                {u.locations?.length
                  ? u.locations.map((id) => locations.find((l) => l.id === id)?.title ?? id).join(', ')
                  : 'Все локации'}
              </p>
            )}
          </div>

          {canAssign && (
            <div>
              <span className="text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
                Закреплённые объекты ({u.objects?.length ?? 0})
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {objects.map((o) => {
                  const on = u.objects?.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setUserObjects(u, toggle(u.objects ?? [], o.id))}
                      className={cn(
                        'flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.9em] transition-colors',
                        on
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input bg-card hover:bg-secondary',
                      )}
                    >
                      <Icon name={on ? 'Check' : 'Building2'} size={13} />
                      {o.title}
                    </button>
                  );
                })}
              </div>
              {u.objects?.length === 0 && (
                <p className="mt-1 text-[0.9em] text-muted-foreground">
                  Объекты не закреплены — сотрудник видит только свою локацию.
                </p>
              )}
            </div>
          )}

          {canAssign && ['inspector', 'driver', 'mechanic'].includes(u.role) && (
            <div>
              <span className="text-[0.8em] uppercase tracking-[0.1em] text-muted-foreground">
                Старший инспектор
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setUserChief(u, '')}
                  className={cn(
                    'rounded-sm border px-2 py-1 text-[0.9em] transition-colors',
                    !u.chief
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-input bg-card hover:bg-secondary',
                  )}
                >
                  Не назначен
                </button>
                {chiefs.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setUserChief(u, c.fio)}
                    className={cn(
                      'rounded-sm border px-2 py-1 text-[0.9em] transition-colors',
                      u.chief === c.fio
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-input bg-card hover:bg-secondary',
                    )}
                  >
                    {c.fio}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canManage && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                className="h-8 gap-1.5 rounded-sm text-[0.9em]"
                onClick={() => {
                  setReset(u);
                  setPass('');
                }}
              >
                <Icon name="KeyRound" size={14} />
                Сбросить пароль
              </Button>
              <Button
                variant="ghost"
                className="h-8 gap-1.5 rounded-sm text-[0.9em] text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  removeUser(u.id);
                  toast({ title: 'Учётная запись удалена' });
                }}
              >
                <Icon name="Trash2" size={14} />
                Удалить
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-2">
      <Panel
        title="Инспекторы строительного контроля"
        note={`${inspectors.length}`}
        action={
          canManage && (
            <Button
              size="sm"
              onClick={() => setForm(true)}
              className="ml-3 h-8 gap-1.5 rounded-sm bg-accent px-3 font-head text-[0.85em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="UserPlus" size={14} />
              Добавить
            </Button>
          )
        }
      >
        {inspectors.length === 0 ? (
          <Empty
            icon="HardHat"
            title="Инспекторы не зарегистрированы"
            hint="Список пополняется при регистрации инспекторов."
          />
        ) : (
          inspectors.map(card)
        )}
      </Panel>

      <Panel title="Прочий персонал" note={`${others.length}`}>
        {others.length === 0 ? (
          <Empty icon="Users" title="Других учётных записей нет" />
        ) : (
          others.map(card)
        )}
      </Panel>

      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Новый сотрудник
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Логин — это ФИО. Пароль передайте сотруднику лично.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                ФИО — логин
              </Label>
              <Input
                value={nFio}
                onChange={(e) => setNFio(e.target.value)}
                className="rounded-sm"
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="rounded-sm border border-accent/40 bg-accent/[0.06] px-3 py-2.5 text-[0.8em] leading-snug text-muted-foreground">
              <span className="font-bold text-foreground">Пароль не нужен.</span> Сотрудник входит
              по своим ФИО с пустым полем пароля, после первого входа система сама попросит его
              задать постоянный пароль.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Телефон
                </Label>
                <Input
                  value={nPhone}
                  onChange={(e) => setNPhone(e.target.value)}
                  className="rounded-sm"
                  placeholder="+7 900 000-00-00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Должность
              </Label>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {roleChoices.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNRole(r)}
                    className={cn(
                      'flex items-center gap-2 rounded-sm border px-2.5 py-2 text-left text-[0.85em] transition-colors',
                      nRole === r
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-input hover:bg-secondary',
                    )}
                    title={ROLE_NOTE[r]}
                  >
                    <Icon name={ROLE_ICON[r]} size={15} className="flex-none" />
                    <span className="min-w-0 truncate">{ROLE_LABEL[r]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Доступ к локациям
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {locations.map((l) => {
                  const on = nLocs.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setNLocs((p) => toggle(p, l.id))}
                      className={cn(
                        'flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[0.85em] transition-colors',
                        on
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      <Icon name={on ? 'Check' : l.icon} size={14} />
                      {l.title}
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.75em] text-muted-foreground">
                Сотрудник увидит только отмеченные локации. Руководителям можно не отмечать —
                у них доступ ко всем.
              </p>
            </div>

            {(nRole === 'driver' || nRole === 'mechanic') && (
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Проект — подставится в путевые листы
                </Label>
                {nLocs.length === 1 && fields.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {fields.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setNProject(f.title)}
                        className={cn(
                          'rounded-sm border px-2.5 py-1.5 text-[0.85em] transition-colors',
                          nProject === f.title
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-input hover:bg-secondary',
                        )}
                      >
                        {f.title}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={nProject}
                    onChange={(e) => setNProject(e.target.value)}
                    className="rounded-sm"
                    placeholder={
                      nLocs.length === 1
                        ? 'Название проекта'
                        : 'Отметьте одну локацию — появится список проектов'
                    }
                  />
                )}
              </div>
            )}

            {nRole === 'inspector' && (
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Специализация
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTIES.map((sp) => {
                    const on = nSpec.includes(sp);
                    return (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setNSpec((p) => toggle(p, sp))}
                        className={cn(
                          'rounded-sm border px-2 py-1 text-[0.82em] transition-colors',
                          on
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-input hover:bg-secondary',
                        )}
                      >
                        {sp}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              onClick={createUser}
              disabled={busy}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'UserPlus'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              {busy ? 'Создаём…' : 'Создать учётную запись'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reset} onOpenChange={(v) => !v && setReset(null)}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Сброс пароля
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">{reset?.fio}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Новый пароль
            </Label>
            <Input
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doReset()}
              className="rounded-sm"
              placeholder="Минимум 4 символа"
            />
          </div>
          <Button
            onClick={doReset}
            className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="KeyRound" size={16} />
            Установить пароль
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffSection;