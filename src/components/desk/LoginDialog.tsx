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
import { useProfile, Role, ROLE_ORDER, ROLE_LABEL, ROLE_NOTE, ROLE_ICON } from '@/data/profile';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
  const { profile, save } = useProfile();
  const [role, setRole] = useState<Role | null>(null);
  const [fio, setFio] = useState(profile.fio);
  const [pass, setPass] = useState('');
  const { toast } = useToast();

  const back = () => {
    setRole(null);
    setPass('');
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
    save({ fio: fio.trim(), role });
    toast({
      title: `Вход выполнен · ${ROLE_LABEL[role]}`,
      description: 'Права доступа применены к рабочему столу.',
    });
    setPass('');
    setRole(null);
    onOpenChange(false);
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
          <div className="space-y-3">
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
