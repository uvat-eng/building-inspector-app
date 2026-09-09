import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Role, ROLE_LABEL, ROLE_ICON, useProfile } from '@/data/profile';
import { useUsers, User, norm } from '@/data/users';
import { startImpersonation } from '@/data/impersonate';

interface CabinetPickerProps {
  role: Role | null;
  onOpenChange: (v: boolean) => void;
  onEntered: () => void;
}

const CabinetPicker = ({ role, onOpenChange, onEntered }: CabinetPickerProps) => {
  const { users, loading, reload } = useUsers();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (role) {
      setQ('');
      reload().catch(() => undefined);
    }
  }, [role, reload]);

  const list = useMemo(() => {
    if (!role) return [];
    const term = norm(q);
    return users
      .filter((u) => u.role === role && u.id !== profile.userId)
      .filter((u) => !term || norm(u.fio).includes(term) || norm(u.group ?? '').includes(term))
      .sort((a, b) => a.fio.localeCompare(b.fio, 'ru'));
  }, [users, role, q, profile.userId]);

  const enter = (u: User) => {
    startImpersonation(u, profile);
    toast({
      title: `Вы в кабинете · ${ROLE_LABEL[u.role]}`,
      description: `${u.fio}. Полный доступ ко всем функциям сотрудника.`,
    });
    onOpenChange(false);
    onEntered();
  };

  return (
    <Dialog open={!!role} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-sm border-t-2 border-t-accent">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-head text-[1.25em] uppercase tracking-[0.03em]">
            {role && (
              <Icon name={ROLE_ICON[role]} fallback="User" size={18} className="text-accent" />
            )}
            {role ? ROLE_LABEL[role] : ''}
          </DialogTitle>
          <DialogDescription className="text-[0.85em]">
            Выберите сотрудника — вы войдёте в его кабинет с полным доступом и правом
            редактирования.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Icon
            name="Search"
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по ФИО или группе"
            className="rounded-sm pl-9"
          />
        </div>

        <div className="scrollbar-thin max-h-[46vh] overflow-y-auto rounded-sm border border-border">
          {loading && !list.length ? (
            <p className="px-3 py-6 text-center text-[0.85em] text-muted-foreground">
              Загружаем сотрудников…
            </p>
          ) : !list.length ? (
            <p className="px-3 py-6 text-center text-[0.85em] leading-snug text-muted-foreground">
              {q
                ? 'Никого не нашли по этому запросу.'
                : `Сотрудников с должностью «${role ? ROLE_LABEL[role] : ''}» пока нет.`}
            </p>
          ) : (
            list.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => enter(u)}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0',
                  'hover:bg-secondary',
                )}
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-sm border border-border bg-secondary/60">
                  <Icon
                    name={ROLE_ICON[u.role]}
                    fallback="User"
                    size={15}
                    className="text-accent"
                  />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[0.92em] font-bold">{u.fio}</b>
                  <span className="block truncate text-[0.78em] text-muted-foreground">
                    {u.group ? `Группа «${u.group}»` : 'Группа не назначена'}
                  </span>
                </span>
                <Icon name="LogIn" size={15} className="flex-none text-accent" />
              </button>
            ))
          )}
        </div>

        <p className="rounded-sm border border-border bg-secondary/50 px-3 py-2.5 text-[0.78em] leading-snug text-muted-foreground">
          Вернуться в свой кабинет можно в любой момент — кнопка появится вверху экрана.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default CabinetPicker;