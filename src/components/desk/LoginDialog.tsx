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

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEntered?: (role: Role) => void;
}

const LoginDialog = ({ open, onOpenChange, onEntered }: LoginDialogProps) => {
  const { profile, save } = useProfile();
  const [role, setRole] = useState<Role | null>(null);
  const [fio, setFio] = useState(profile.fio);
  const [group, setGroup] = useState(profile.group);
  const [spec, setSpec] = useState<string[]>(profile.specialties ?? []);
  const [specOpen, setSpecOpen] = useState(false);
  const [pass, setPass] = useState('');
  const { toast } = useToast();

  const toggleSpec = (s: string) =>
    setSpec((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const back = () => {
    setRole(null);
    setPass('');
    setSpecOpen(false);
  };

  const close = (v: boolean) => {
    if (!v) back();
    onOpenChange(v);
  };

  const submit = () => {
    if (!role) return;
    if (!fio.trim()) {
      toast({ title: 'Укажите фамилию и имя', variant: 'destructive' });
      return;
    }
    if (role === 'inspector' && spec.length === 0) {
      toast({ title: 'Выберите хотя бы одну специализацию', variant: 'destructive' });
      return;
    }
    save({ fio: fio.trim(), role, group: group.trim(), specialties: spec });
    toast({
      title: `Вход выполнен · ${ROLE_LABEL[role]}`,
      description: 'Права доступа применены к рабочему столу.',
    });
    setPass('');
    setRole(null);
    onOpenChange(false);
    onEntered?.(role);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.4em] uppercase tracking-[0.03em]">
            {role ? 'Вход в систему' : 'Выберите роль'}
          </DialogTitle>
          <DialogDescription className="text-[0.85em] text-muted-foreground">
            {role
              ? `Роль: ${ROLE_LABEL[role]}. ${ROLE_NOTE[role]}.`
              : 'Роль определяет, какие разделы и действия будут доступны.'}
          </DialogDescription>
        </DialogHeader>

        {!role ? (
          <div className="-mx-6 border-y border-foreground/85">
            {ROLE_ORDER.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
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
        ) : (
          <div className="scrollbar-thin max-h-[58vh] space-y-3 overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Фамилия, имя, отчество
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
                Специализация {role === 'inspector' && <span className="text-accent">·</span>}
              </Label>
              <button
                type="button"
                onClick={() => setSpecOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-sm border border-input bg-background px-3 py-2 text-left text-[0.9em]"
              >
                <span className={cn('min-w-0 flex-1 truncate', !spec.length && 'text-muted-foreground')}>
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

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Пароль
              </Label>
              <Input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="rounded-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
        )}

        {role && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={back}
              className="gap-1.5 rounded-sm font-head uppercase tracking-[0.06em]"
            >
              <Icon name="ChevronLeft" size={16} />
              Роли
            </Button>
            <Button
              onClick={submit}
              className={cn(
                'flex-1 gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em]',
                'text-accent-foreground hover:bg-accent/90',
              )}
            >
              <Icon name="LogIn" size={16} />
              Войти
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;