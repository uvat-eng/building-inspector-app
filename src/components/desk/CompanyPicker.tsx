import { useState } from 'react';
import Topbar from '@/components/desk/Topbar';
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
import { useToast } from '@/hooks/use-toast';
import {
  Company,
  CreatedUser,
  createCompany,
  fetchMainCompany,
  joinCompany,
  switchCompany,
} from '@/lib/company';

interface CompanyPickerProps {
  /** Компания выбрана. Если вместе с ней создан директор — он передаётся сюда. */
  onReady: (company: Company, user?: CreatedUser) => void;
}

const ERRORS: Record<string, string> = {
  name_required: 'Укажите название компании',
  fio_required: 'Укажите фамилию, имя и отчество руководителя',
  password_short: 'Пароль — минимум 4 символа',
  not_found: 'Компания с таким кодом не найдена',
  bad_code: 'Код — 6 символов, буквы и цифры',
  temporarily_closed: 'Регистрация компаний временно недоступна',
};

/** Регистрация новых компаний и вход по коду открыты. */
const SIGNUP_OPEN = true;

const errText = (e: unknown) => ERRORS[(e as Error).message] ?? 'Нет связи с сервером. Повторите.';

const CompanyPicker = ({ onReady }: CompanyPickerProps) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'' | 'main' | 'create' | 'join'>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const [name, setName] = useState('');
  const [fio, setFio] = useState('');
  const [pass, setPass] = useState('');
  const [code, setCode] = useState('');

  const done = (company: Company, user?: CreatedUser) => {
    const changed = switchCompany(company);
    if (changed) {
      window.location.reload();
      return;
    }
    onReady(company, user);
  };

  const enterMain = async () => {
    setBusy('main');
    try {
      const c = await fetchMainCompany();
      if (!c) throw new Error('not_found');
      done(c);
    } catch (e) {
      toast({ title: 'Не удалось войти', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const create = async () => {
    if (name.trim().length < 2) {
      toast({ title: ERRORS.name_required, variant: 'destructive' });
      return;
    }
    if (fio.trim().split(/\s+/).length < 2) {
      toast({ title: ERRORS.fio_required, variant: 'destructive' });
      return;
    }
    if (pass.length < 4) {
      toast({ title: ERRORS.password_short, variant: 'destructive' });
      return;
    }
    setBusy('create');
    try {
      const { item, user } = await createCompany(name.trim(), fio.trim(), pass);
      setCreateOpen(false);
      toast({
        title: 'Компания создана',
        description: `Демо-доступ открыт. Вы вошли как руководитель — ${user.fio}.`,
      });
      done(item, user);
    } catch (e) {
      toast({ title: 'Компания не создана', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const join = async () => {
    setBusy('join');
    try {
      const c = await joinCompany(code);
      setJoinOpen(false);
      done(c);
    } catch (e) {
      toast({ title: 'Не удалось войти', description: errText(e), variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const tile =
    'group flex w-full items-start gap-3 rounded-sm border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg disabled:pointer-events-none disabled:opacity-60';

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <Topbar />

      <main className="scrollbar-thin flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:px-6">
        <div className="w-full max-w-xl animate-rise">
          <div className="text-center">
            <img
              src="/emblem.png"
              alt="Инспектор СК"
              className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24"
            />
            <h1 className="mt-4 font-head text-[26px] uppercase leading-[1.1] tracking-[0.04em] sm:text-[32px]">
              Инспектор <span className="text-accent">СК</span>
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[0.88em] text-muted-foreground">
              Выберите свою компанию или зарегистрируйте новую. Данные каждой компании
              хранятся отдельно и недоступны другим.
            </p>
          </div>

          <div className="mt-7 space-y-2.5">
            <button
              type="button"
              onClick={enterMain}
              disabled={!!busy}
              className={`${tile} border-border`}
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                <Icon
                  name={busy === 'main' ? 'Loader2' : 'Building2'}
                  size={21}
                  className={busy === 'main' ? 'animate-spin' : ''}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[1.05em] uppercase tracking-[0.03em]">
                  ООО «Глобал-Стройинжиниринг»
                </span>
                <span className="mt-1 block text-[0.8em] leading-snug text-muted-foreground">
                  Вход для сотрудников компании
                </span>
              </span>
              <Icon
                name="ArrowRight"
                size={17}
                className="mt-1 flex-none text-muted-foreground transition-colors group-hover:text-accent"
              />
            </button>

            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              disabled={!!busy || !SIGNUP_OPEN}
              className={`${tile} border-border`}
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-foreground text-background">
                <Icon name="KeyRound" size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[1.05em] uppercase tracking-[0.03em]">
                  Войти по коду компании
                </span>
                <span className="mt-1 block text-[0.8em] leading-snug text-muted-foreground">
                  Код выдаёт руководитель вашей компании
                </span>
              </span>
              <Icon
                name="ArrowRight"
                size={17}
                className="mt-1 flex-none text-muted-foreground transition-colors group-hover:text-accent"
              />
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={!!busy || !SIGNUP_OPEN}
              className={`${tile} border-dashed border-accent/60 bg-accent/5`}
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm border border-accent text-accent">
                <Icon name="Plus" size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-head text-[1.05em] uppercase tracking-[0.03em]">
                  Создать компанию
                </span>
                <span className="mt-1 block text-[0.8em] leading-snug text-muted-foreground">
                  {SIGNUP_OPEN
                    ? 'Бесплатный демо-доступ сразу. Полный доступ — покупкой в приложении'
                    : 'Скоро: регистрация новых компаний готовится к запуску'}
                </span>
              </span>
              <Icon
                name="ArrowRight"
                size={17}
                className="mt-1 flex-none text-muted-foreground transition-colors group-hover:text-accent"
              />
            </button>
          </div>

          <div className="mt-6 flex justify-center gap-4 text-[0.78em] text-muted-foreground">
            <a href="/privacy" className="hover:text-accent">
              Политика конфиденциальности
            </a>
            <a href="/support" className="hover:text-accent">
              Поддержка
            </a>
          </div>
        </div>
      </main>

      <Dialog open={createOpen} onOpenChange={(v) => !busy && setCreateOpen(v)}>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.3em] uppercase tracking-[0.03em]">
              Новая компания
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Вы станете руководителем компании и сможете приглашать сотрудников. Работа
              начинается с чистого листа — данные других компаний вам не видны.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Название компании
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ООО «Ваша компания»"
                className="rounded-sm"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Руководитель — ФИО (это ваш логин)
              </Label>
              <Input
                value={fio}
                onChange={(e) => setFio(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="rounded-sm"
                maxLength={120}
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
                onKeyDown={(e) => e.key === 'Enter' && create()}
                placeholder="Не короче 4 символов"
                className="rounded-sm"
              />
            </div>

            <div className="rounded-sm border border-border bg-secondary/50 p-3 text-[0.78em] leading-snug text-muted-foreground">
              <p className="font-semibold text-foreground">Демо-доступ включает:</p>
              <p className="mt-1">
                до 2 объектов, 3 сотрудников, 10 актов осмотра, 2 единиц техники и 1 локации.
                Все разделы открыты. Снять ограничения можно в любой момент покупкой полного
                доступа.
              </p>
            </div>

            <Button
              onClick={create}
              disabled={!!busy}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy === 'create' ? 'Loader2' : 'Rocket'}
                size={16}
                className={busy === 'create' ? 'animate-spin' : ''}
              />
              {busy === 'create' ? 'Создаём…' : 'Создать и начать работу'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={joinOpen} onOpenChange={(v) => !busy && setJoinOpen(v)}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.3em] uppercase tracking-[0.03em]">
              Код компании
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Попросите код у руководителя: он есть в его кабинете. Затем войдите под своей
              учётной записью.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && join()}
            placeholder="ABC123"
            maxLength={8}
            autoCapitalize="characters"
            className="rounded-sm text-center font-mono text-[1.4em] tracking-[0.3em]"
          />
          <Button
            onClick={join}
            disabled={!!busy || code.length < 4}
            className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon
              name={busy === 'join' ? 'Loader2' : 'LogIn'}
              size={16}
              className={busy === 'join' ? 'animate-spin' : ''}
            />
            Продолжить
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyPicker;
