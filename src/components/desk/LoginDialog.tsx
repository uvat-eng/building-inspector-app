import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useProfile, Role, ROLE_LABEL, ROLE_NOTE } from '@/data/profile';
import { loginUser, registerUser, setSession, fetchUsers, User } from '@/data/users';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEntered?: (role: Role) => void;
  adminMode?: boolean;
  expectRole?: Role | null;
}

const LoginDialog = ({
  open,
  onOpenChange,
  onEntered,
  adminMode,
  expectRole,
}: LoginDialogProps) => {
  const { save } = useProfile();
  const { toast } = useToast();

  const [fio, setFio] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchUsers()
      .then((list) => setEmpty(list.length === 0))
      .catch(() => setEmpty(false));
  }, [open]);

  const close = (v: boolean) => {
    if (!v) {
      setFio('');
      setPass('');
    }
    onOpenChange(v);
  };

  const enter = (user: User) => {
    setSession(user.id);
    save({
      fio: user.fio,
      role: user.role,
      group: user.group,
      locations: user.locations ?? [],
      specialties: user.specialties,
      org: user.org,
    });
    toast({
      title: `Вход выполнен · ${ROLE_LABEL[user.role]}`,
      description: user.mustChangePassword
        ? 'Пароль временный — смените его в профиле на постоянный.'
        : user.fio,
    });
    setFio('');
    setPass('');
    onOpenChange(false);
    onEntered?.(user.role);
  };

  const doLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const user = await loginUser(fio, pass);
      if (expectRole && user.role !== expectRole && user.role !== 'admin') {
        toast({
          title: `Вы не ${ROLE_LABEL[expectRole].toLowerCase()}`,
          description: `Ваша учётная запись — ${ROLE_LABEL[user.role]}. Выберите свою должность.`,
          variant: 'destructive',
        });
        return;
      }
      if (adminMode && user.role !== 'admin') {
        toast({
          title: 'Это не учётная запись администратора',
          description: 'Войдите через свой модуль.',
          variant: 'destructive',
        });
        return;
      }
      enter(user);
    } catch (e) {
      const code = (e as Error).message;
      toast({
        title:
          code === 'not_found'
            ? 'Пользователь не найден'
            : code === 'wrong_password'
              ? 'Неверный пароль'
              : 'Не удалось войти',
        description:
          code === 'not_found'
            ? 'Логин и пароль выдаёт менеджер или координатор проекта.'
            : undefined,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const createFirst = async () => {
    if (fio.trim().split(/\s+/).length < 2) {
      toast({ title: 'Укажите фамилию, имя и отчество', variant: 'destructive' });
      return;
    }
    if (pass.length < 4) {
      toast({ title: 'Пароль минимум 4 символа', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const user = await registerUser({
        fio: fio.trim().replace(/\s+/g, ' '),
        password: pass,
        role: adminMode ? 'admin' : (expectRole ?? 'pm'),
        group: '',
        org: 'ООО «Глобал-Стройинжиниринг»',
        phone: '',
        locations: [],
        specialties: [],
        certificates: [],
        educations: [],
      });
      enter(user);
    } catch {
      toast({ title: 'Не удалось создать учётную запись', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.4em] uppercase tracking-[0.03em]">
            {empty
              ? 'Первый вход'
              : adminMode
                ? 'Вход администратора'
                : expectRole
                  ? ROLE_LABEL[expectRole]
                  : 'Вход в систему'}
          </DialogTitle>
          <DialogDescription className="text-[0.85em] text-muted-foreground">
            {empty
              ? `В системе ещё нет сотрудников. Создайте учётную запись ${adminMode ? 'администратора' : 'менеджера проекта'} — дальше доступы выдаёт он.`
              : adminMode
                ? 'Доступ только для администратора системы.'
                : expectRole
                  ? `${ROLE_NOTE[expectRole]}. Логин — ваши фамилия, имя и отчество.`
                  : 'Логин — ваши фамилия, имя и отчество на русском языке.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              {adminMode || expectRole === 'admin' ? 'Логин' : 'Логин — ФИО'}
            </Label>
            <Input
              value={fio}
              onChange={(e) => setFio(e.target.value)}
              className="rounded-sm"
              placeholder={adminMode || expectRole === 'admin' ? 'админ' : 'Иванов Иван Иванович'}
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
              onKeyDown={(e) => e.key === 'Enter' && (empty ? createFirst() : doLogin())}
              className="rounded-sm"
              placeholder="••••••••"
            />
          </div>

          <Button
            onClick={empty ? createFirst : doLogin}
            disabled={busy}
            className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy ? 'Loader2' : empty ? 'UserPlus' : 'LogIn'}
              size={16}
              className={busy ? 'animate-spin' : ''}
            />
            {busy ? 'Проверяем…' : empty ? 'Создать и войти' : 'Войти'}
          </Button>

          {!adminMode && (
            <p className="rounded-sm border border-border bg-secondary/50 px-3 py-2.5 text-center text-[0.78em] leading-snug text-muted-foreground">
              Учётные записи создаёт менеджер или координатор проекта. Он же выдаёт пароль и
              открывает доступ к локациям.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
