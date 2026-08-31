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
import { useProfile, ROLE_LABEL, ROLE_ICON } from '@/data/profile';
import { useUsers, updateUser, removeUser, User } from '@/data/users';

const StaffSection = () => {
  const { profile } = useProfile();
  const { users } = useUsers();
  const { toast } = useToast();

  const [reset, setReset] = useState<User | null>(null);
  const [pass, setPass] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const canManage = profile.role === 'coordinator' || profile.role === 'director';

  const doReset = () => {
    if (!reset) return;
    if (pass.length < 4) {
      toast({ title: 'Пароль минимум 4 символа', variant: 'destructive' });
      return;
    }
    updateUser(reset.id, { password: pass });
    toast({ title: 'Пароль сброшен', description: `${reset.fio} — выдайте новый пароль лично.` });
    setReset(null);
    setPass('');
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
      <Panel title="Инспекторы строительного контроля" note={`${inspectors.length}`}>
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
