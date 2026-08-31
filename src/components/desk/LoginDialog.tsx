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
import { useToast } from '@/hooks/use-toast';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
  const [login, setLogin] = useState('');
  const [pass, setPass] = useState('');
  const { toast } = useToast();

  const submit = () => {
    if (!login.trim() || !pass.trim()) {
      toast({ title: 'Введите логин и пароль', variant: 'destructive' });
      return;
    }
    toast({
      title: 'Вход выполнен',
      description: `Добро пожаловать, ${login.trim()}.`,
    });
    setPass('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-head text-[1.4em] uppercase tracking-[0.03em]">
            Вход в систему
          </DialogTitle>
          <DialogDescription className="text-[0.85em] text-muted-foreground">
            Доступ к рабочему столу инспектора строительного контроля.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Логин или табельный номер
            </Label>
            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="rounded-sm"
              placeholder="ivanov.ii"
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

        <Button
          onClick={submit}
          className="mt-2 w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
        >
          <Icon name="LogIn" size={16} />
          Войти
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
