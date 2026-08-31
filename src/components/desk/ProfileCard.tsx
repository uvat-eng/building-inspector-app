import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useProfile, ROLE_LABEL, Role, shortFio } from '@/data/profile';

const ProfileCard = () => {
  const { profile, save } = useProfile();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(profile);

  const start = () => {
    setF(profile);
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="group mt-auto w-full border-t-2 border-foreground/85 px-[18px] py-3.5 text-left text-[0.8em] leading-[1.5] text-muted-foreground transition-colors hover:bg-foreground hover:text-background/80"
      >
        <b className="flex items-center gap-1.5 text-[1.1em] font-bold text-foreground group-hover:text-background">
          {profile.fio ? shortFio(profile.fio) : 'Профиль не заполнен'}
          <Icon name="Pencil" size={12} className="text-accent" />
        </b>
        {ROLE_LABEL[profile.role]}
        <span className="mt-1 block text-[0.95em]">
          {profile.group ? `Группа «${profile.group}»` : 'Группа не назначена'}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-sm border-t-2 border-t-accent">
          <DialogHeader>
            <DialogTitle className="font-head text-xl uppercase tracking-[0.04em]">
              Карточка пользователя
            </DialogTitle>
            <DialogDescription>ФИО, роль и группа определяют права доступа</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Фамилия Имя Отчество
              </Label>
              <Input
                value={f.fio}
                onChange={(e) => setF({ ...f, fio: e.target.value })}
                placeholder="Иванов Иван Иванович"
                className="rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Должность
              </Label>
              <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as Role })}>
                <SelectTrigger className="rounded-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Группа / проект
              </Label>
              <Input
                value={f.group}
                onChange={(e) => setF({ ...f, group: e.target.value })}
                placeholder="Якутия-Запад"
                className="rounded-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Организация
              </Label>
              <Input
                value={f.org}
                onChange={(e) => setF({ ...f, org: e.target.value })}
                className="rounded-sm"
              />
            </div>

            <p className="rounded-sm bg-secondary/60 p-3 text-[0.85em] text-muted-foreground">
              Добавлять и удалять объекты могут директор, координатор и руководитель проекта. Остальные
              роли видят карту и данные в режиме просмотра.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-sm" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button
              className="rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                save(f);
                setOpen(false);
              }}
            >
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfileCard;