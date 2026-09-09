import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ROLE_LABEL } from '@/data/profile';
import { User, useUsers } from '@/data/users';

interface DriverContactsProps {
  onShift: User[];
}

export const SOS_CONTACT = {
  fio: 'Кобелев Иван Васильевич',
  phone: '+79220702555',
};

const tel = (v: string) => v.replace(/[^\d+]/g, '');

const DriverContacts = ({ onShift }: DriverContactsProps) => {
  const { users, current } = useUsers();
  const [card, setCard] = useState<User | null>(null);
  const [sos, setSos] = useState(false);

  const chief = useMemo(
    () =>
      users.find((u) => u.id === current?.chief) ??
      users.find((u) => u.role === 'engineer') ??
      null,
    [users, current?.chief],
  );
  const mechanic = useMemo(() => users.find((u) => u.role === 'mechanic') ?? null, [users]);
  const manager = useMemo(() => users.find((u) => u.role === 'manager') ?? null, [users]);

  const key = [
    { u: chief, l: 'Старший инспектор', i: 'UserCog' },
    { u: mechanic, l: 'Механик', i: 'Wrench' },
    { u: manager, l: 'Руководитель проекта', i: 'SquarePen' },
  ].filter((x) => x.u) as { u: User; l: string; i: string }[];

  return (
    <>
      <Panel
        title="Инспекторы на вахте"
        note={`${onShift.length}`}
        className="flex-none"
      >
        {!onShift.length ? (
          <Empty
            icon="Users"
            title="Сейчас на вахте никого"
            hint="Список обновится, когда инспекторы отметятся в табеле."
          />
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
            {onShift.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setCard(u)}
                className="flex items-center gap-2.5 rounded-sm border border-border border-l-[3px] border-l-emerald-600 bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary"
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                  <Icon name="UserCheck" size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.86em]">{u.fio}</span>
                  <span className="block truncate text-[0.72em] text-muted-foreground">
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </span>
                <Icon name="Phone" size={14} className="flex-none text-accent" />
              </button>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid flex-none gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {key.map((x) => (
          <button
            key={x.l}
            type="button"
            onClick={() => setCard(x.u)}
            className="flex items-center gap-3 rounded-sm border border-border border-t-2 border-t-accent bg-card px-3.5 py-3 text-left transition-colors hover:bg-secondary"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Icon name={x.i} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.68em] uppercase tracking-[0.09em] text-muted-foreground">
                {x.l}
              </span>
              <span className="block truncate font-head text-[0.88em] uppercase tracking-[0.02em]">
                {x.u.fio}
              </span>
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSos(true)}
          className="flex items-center gap-3 rounded-sm border-2 border-destructive bg-destructive px-3.5 py-3 text-left text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-background/20">
            <Icon name="TriangleAlert" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-head text-[1.15em] uppercase tracking-[0.16em]">
              SOS
            </span>
            <span className="block truncate text-[0.7em] uppercase tracking-[0.08em] opacity-80">
              экстренная связь
            </span>
          </span>
        </button>
      </div>

      <Dialog open={!!card} onOpenChange={(v) => !v && setCard(null)}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
              {card?.fio}
            </DialogTitle>
            <DialogDescription>
              {card ? ROLE_LABEL[card.role] ?? card.role : ''}
              {card?.group ? ` · ${card.group}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {card?.phone ? (
              <a
                href={`tel:${tel(card.phone)}`}
                className="flex items-center gap-3 rounded-sm border border-border bg-card px-3.5 py-3 transition-colors hover:border-accent"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                  <Icon name="Phone" size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block font-head text-[1.05em]">{card.phone}</span>
                  <span className="block text-[0.72em] uppercase tracking-[0.08em] text-muted-foreground">
                    нажмите, чтобы позвонить
                  </span>
                </span>
              </a>
            ) : (
              <p className="rounded-sm border border-border bg-secondary/40 px-3 py-3 text-[0.84em] text-muted-foreground">
                Телефон не указан. Попросите добавить его в профиль.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sos} onOpenChange={setSos}>
        <DialogContent className="max-w-sm rounded-sm border-2 border-destructive">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-head text-[1.2em] uppercase tracking-[0.1em] text-destructive">
              <Icon name="TriangleAlert" size={20} />
              SOS · экстренная связь
            </DialogTitle>
            <DialogDescription>Звоните в любой ситуации, круглосуточно.</DialogDescription>
          </DialogHeader>
          <a
            href={`tel:${SOS_CONTACT.phone}`}
            className={cn(
              'flex items-center gap-3 rounded-sm border-2 border-destructive bg-destructive px-3.5 py-4',
              'text-destructive-foreground transition-colors hover:bg-destructive/90',
            )}
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-sm bg-background/20">
              <Icon name="PhoneCall" size={20} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-head text-[1em] uppercase tracking-[0.03em]">
                {SOS_CONTACT.fio}
              </span>
              <span className="block font-head text-[1.15em]">{SOS_CONTACT.phone}</span>
            </span>
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DriverContacts;
