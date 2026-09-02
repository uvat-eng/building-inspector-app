import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { changePassword, User } from '@/data/users';

interface Props {
  user: User;
  onDone?: () => void;
}

const ERRORS: Record<string, string> = {
  wrong_password: 'Текущий пароль указан неверно',
  too_short: 'Новый пароль минимум 4 символа',
  same_password: 'Новый пароль совпадает со старым',
};

const ChangePassword = ({ user, onDone }: Props) => {
  const { toast } = useToast();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (newPass.length < 4) {
      toast({ title: 'Новый пароль минимум 4 символа', variant: 'destructive' });
      return;
    }
    if (newPass !== repeat) {
      toast({ title: 'Пароли не совпадают', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await changePassword(user.id, oldPass, newPass);
      setOldPass('');
      setNewPass('');
      setRepeat('');
      toast({
        title: 'Пароль изменён',
        description: 'В следующий раз входите с новым паролем.',
      });
      onDone?.();
    } catch (e) {
      toast({
        title: ERRORS[(e as Error).message] ?? 'Не удалось изменить пароль',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const input = (label: string, value: string, set: (v: string) => void, ph: string) => (
    <div className="space-y-1">
      <Label className="text-[0.68em] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </Label>
      <Input
        type="password"
        value={value}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={ph}
        className="h-9 rounded-sm"
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {user.mustChangePassword && (
        <p className="flex items-start gap-2 rounded-sm border border-accent/40 bg-accent/10 px-3 py-2.5 text-[0.82em] leading-snug">
          <Icon name="TriangleAlert" size={15} className="mt-0.5 flex-none text-accent" />
          Вы вошли под временным паролем. Придумайте свой постоянный — его не будет знать никто,
          кроме вас.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {input('Текущий пароль', oldPass, setOldPass, 'Выданный вам')}
        {input('Новый пароль', newPass, setNewPass, 'Минимум 4 символа')}
        {input('Повторите новый', repeat, setRepeat, 'Ещё раз')}
      </div>

      <Button
        onClick={submit}
        disabled={busy}
        className="gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
      >
        <Icon
          name={busy ? 'Loader2' : 'KeyRound'}
          size={16}
          className={busy ? 'animate-spin' : ''}
        />
        {busy ? 'Меняем…' : 'Изменить пароль'}
      </Button>
    </div>
  );
};

export default ChangePassword;
