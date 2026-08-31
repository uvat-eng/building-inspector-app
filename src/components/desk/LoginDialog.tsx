import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useProfile,
  Role,
  ROLE_ORDER,
  ROLE_LABEL,
  ROLE_NOTE,
  ROLE_ICON,
  SPECIALTIES,
} from '@/data/profile';
import { findByFio, registerUser, setSession, norm, readUsers, User } from '@/data/users';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEntered?: (role: Role) => void;
}

type Step = 'login' | 'roles' | 'form';

const LoginDialog = ({ open, onOpenChange, onEntered }: LoginDialogProps) => {
  const { save } = useProfile();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('login');
  const [role, setRole] = useState<Role | null>(null);

  const [fio, setFio] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [group, setGroup] = useState('');
  const [phone, setPhone] = useState('');
  const [spec, setSpec] = useState<string[]>([]);
  const [specOpen, setSpecOpen] = useState(false);

  const reset = () => {
    setStep('login');
    setRole(null);
    setFio('');
    setPass('');
    setPass2('');
    setGroup('');
    setPhone('');
    setSpec([]);
    setSpecOpen(false);
  };

  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const enter = (user: User) => {
    setSession(user.id);
    save({
      fio: user.fio,
      role: user.role,
      group: user.group,
      specialties: user.specialties,
      org: user.org,
    });
    toast({ title: `Вход выполнен · ${ROLE_LABEL[user.role]}`, description: user.fio });
    reset();
    onOpenChange(false);
    onEntered?.(user.role);
  };

  const doLogin = () => {
    const user = findByFio(fio);
    if (!user) {
      toast({
        title: 'Пользователь не найден',
        description: 'Проверьте ФИО или пройдите регистрацию.',
        variant: 'destructive',
      });
      return;
    }
    if (user.password !== pass) {
      toast({ title: 'Неверный пароль', variant: 'destructive' });
      return;
    }
    enter(user);
  };

  const doRegister = () => {
    if (!role) return;
    if (norm(fio).split(' ').length < 2) {
      toast({ title: 'Укажите фамилию, имя и отчество', variant: 'destructive' });
      return;
    }
    if (readUsers().some((u) => norm(u.fio) === norm(fio))) {
      toast({ title: 'Такой пользователь уже зарегистрирован', variant: 'destructive' });
      return;
    }
    if (pass.length < 4) {
      toast({ title: 'Пароль минимум 4 символа', variant: 'destructive' });
      return;
    }
    if (pass !== pass2) {
      toast({ title: 'Пароли не совпадают', variant: 'destructive' });
      return;
    }
    if (role === 'inspector' && spec.length === 0) {
      toast({ title: 'Выберите хотя бы одну специализацию', variant: 'destructive' });
      return;
    }
    const user = registerUser({
      fio: fio.trim().replace(/\s+/g, ' '),
      password: pass,
      role,
      group: group.trim(),
      org: 'ООО «Глобал-Стройинжиниринг»',
      phone: phone.trim(),
      specialties: spec,
      certificates: [],
      educations: [],
    });
    enter(user);
  };

  const toggleSpec = (s: string) =>
    setSpec((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const title =
    step === 'login' ? 'Вход в систему' : step === 'roles' ? 'Выберите роль' : 'Регистрация';

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.4em] uppercase tracking-[0.03em]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[0.85em] text-muted-foreground">
            {step === 'login'
              ? 'Логин — ваши фамилия, имя и отчество на русском языке.'
              : step === 'roles'
                ? 'Роль определяет, какие разделы и действия будут доступны.'
                : `${ROLE_LABEL[role!]} · данные вносятся один раз, дальше правятся в профиле.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'login' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Логин — ФИО
              </Label>
              <Input
                value={fio}
                onChange={(e) => setFio(e.target.value)}
                className="rounded-sm"
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Пароль
              </Label>
              <Input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doLogin()}
                className="rounded-sm"
                placeholder="••••••••"
              />
            </div>

            <Button
              onClick={doLogin}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon name="LogIn" size={16} />
              Войти
            </Button>

            <button
              type="button"
              onClick={() => setStep('roles')}
              className="w-full rounded-sm border border-dashed border-input py-2 text-[0.85em] text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            >
              Первый вход — зарегистрироваться
            </button>

            <p className="text-center text-[0.78em] text-muted-foreground">
              Забыли пароль — сброс выполняет координатор проекта.
            </p>
          </div>
        )}

        {step === 'roles' && (
          <>
            <div className="-mx-6 border-y border-foreground/85">
              {ROLE_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setStep('form');
                  }}
                  className="group flex w-full items-center gap-3 border-b border-foreground/85 px-6 py-3 text-left transition-colors last:border-b-0 hover:bg-foreground hover:text-background"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                    <Icon name={ROLE_ICON[r]} fallback="User" size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-head text-[1.05em] uppercase tracking-[0.03em]">
                      {ROLE_LABEL[r]}
                    </span>
                    <span className="block truncate text-[0.78em] text-muted-foreground group-hover:text-background/70">
                      {ROLE_NOTE[r]}
                    </span>
                  </span>
                  <Icon name="ChevronRight" size={18} className="flex-none opacity-50" />
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => setStep('login')}
              className="gap-1.5 rounded-sm font-head uppercase tracking-[0.06em]"
            >
              <Icon name="ChevronLeft" size={16} />
              К входу
            </Button>
          </>
        )}

        {step === 'form' && role && (
          <>
            <div className="scrollbar-thin max-h-[56vh] space-y-3 overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Фамилия, имя, отчество — это ваш логин
                </Label>
                <Input
                  value={fio}
                  onChange={(e) => setFio(e.target.value)}
                  className="rounded-sm"
                  placeholder="Иванов Иван Иванович"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Проект / группа
                </Label>
                <Input
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="rounded-sm"
                  placeholder="Якутия-Запад"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Телефон
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-sm"
                  placeholder="+7 900 000-00-00"
                />
              </div>

              {role === 'inspector' && (
                <div className="space-y-1.5">
                  <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                    Специализация
                  </Label>
                  <button
                    type="button"
                    onClick={() => setSpecOpen((v) => !v)}
                    className="flex w-full items-center gap-2 rounded-sm border border-input bg-background px-3 py-2 text-left text-[0.9em]"
                  >
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate',
                        !spec.length && 'text-muted-foreground',
                      )}
                    >
                      {spec.length ? spec.join(', ') : 'Выберите одну или несколько'}
                    </span>
                    {!!spec.length && (
                      <span className="flex-none rounded-sm bg-accent px-1.5 text-[0.75em] text-accent-foreground">
                        {spec.length}
                      </span>
                    )}
                    <Icon
                      name="ChevronDown"
                      size={16}
                      className={cn('flex-none transition-transform', specOpen && 'rotate-180')}
                    />
                  </button>

                  {specOpen && (
                    <div className="scrollbar-thin max-h-[188px] overflow-y-auto rounded-sm border border-input">
                      {SPECIALTIES.map((s) => {
                        const on = spec.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSpec(s)}
                            className={cn(
                              'flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left text-[0.88em] last:border-b-0',
                              on ? 'bg-secondary' : 'hover:bg-secondary/60',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-4 w-4 flex-none items-center justify-center rounded-[3px] border',
                                on
                                  ? 'border-accent bg-accent text-accent-foreground'
                                  : 'border-input',
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
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                    Пароль
                  </Label>
                  <Input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                    Повторите
                  </Label>
                  <Input
                    type="password"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    className="rounded-sm"
                  />
                </div>
              </div>

              <p className="rounded-sm bg-secondary/60 p-3 text-[0.8em] text-muted-foreground">
                Удостоверения и документы об образовании добавляются позже — в профиле, без
                ограничения по количеству.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('roles')}
                className="gap-1.5 rounded-sm font-head uppercase tracking-[0.06em]"
              >
                <Icon name="ChevronLeft" size={16} />
                Роли
              </Button>
              <Button
                onClick={doRegister}
                className="flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              >
                <Icon name="UserPlus" size={16} />
                Зарегистрироваться
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
