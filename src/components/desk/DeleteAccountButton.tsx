import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { removeUser, setSession, User } from '@/data/users';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  user: User;
}

const DeleteAccountButton = ({ user }: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    await removeUser(user.id).catch(() => undefined);
    setSession(null);
    window.location.href = '/';
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full flex-none items-center justify-center gap-2 border-t border-foreground/20 bg-card px-[18px] py-3 text-[0.8em] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
      >
        <Icon name="Trash2" size={14} />
        Удалить учётную запись
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить учётную запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Учётная запись «{user.fio}» и связанные с ней личные данные будут
              удалены без возможности восстановления. Вы выйдете из приложения и
              больше не сможете войти под этим именем.
              <br />
              <br />
              Рабочие документы по объектам — акты и предписания — остаются у
              организации, как того требуют правила строительного контроля.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                confirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? 'Удаляем…' : 'Удалить навсегда'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeleteAccountButton;
