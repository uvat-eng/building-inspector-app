import { useMemo, useState } from 'react';
import Panel from '@/components/desk/Panel';
import Empty from '@/components/desk/Empty';
import Icon from '@/components/ui/icon';
import CabinetBar from '@/components/desk/CabinetBar';
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
import { cn } from '@/lib/utils';
import { useProfile, ROLE_LABEL } from '@/data/profile';
import { useUsers, registerUser, updateUser, User } from '@/data/users';
import { useObjects, NO_FIELD } from '@/data/store';
import { useLocations, locTitle } from '@/data/locations';

interface ProjectManagersProps {
  onBack?: () => void;
}

const ProjectManagers = ({ onBack }: ProjectManagersProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const { users, current, reload } = useUsers();
  const { list: objects } = useObjects();
  const { list: locations } = useLocations();

  const [form, setForm] = useState(false);
  const [fio, setFio] = useState('');
  const [phone, setPhone] = useState('');
  const [locs, setLocs] = useState<string[]>([]);
  const [objs, setObjs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const managers = useMemo(
    () => users.filter((u: User) => u.role === 'manager'),
    [users],
  );

  const projects = useMemo(() => {
    const map = new Map<string, { key: string; locationId: string; count: number }>();
    objects.forEach((o) => {
      const key = o.field?.trim() || NO_FIELD;
      const prev = map.get(key);
      map.set(key, {
        key,
        locationId: o.location ?? prev?.locationId ?? '',
        count: (prev?.count ?? 0) + 1,
      });
    });
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key, 'ru'));
  }, [objects]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const objectsOfProject = (key: string) =>
    objects.filter((o) => (o.field?.trim() || NO_FIELD) === key);

  const create = async () => {
    if (fio.trim().split(/\s+/).length < 2) {
      toast({ title: 'Укажите фамилию, имя и отчество', variant: 'destructive' });
      return;
    }
    if (!objs.length) {
      toast({
        title: 'Закрепите хотя бы один объект',
        description: 'Руководитель проекта работает только со своими объектами.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      await registerUser(
        {
          fio: fio.trim().replace(/\s+/g, ' '),
          password: '',
          role: 'manager',
          group: '',
          org: profile.org,
          phone: phone.trim(),
          locations: locs,
          objects: objs,
          specialties: [],
          certificates: [],
          educations: [],
        },
        current?.id,
      );
      toast({
        title: 'Руководитель проекта создан',
        description: `${fio.trim()} — первый вход без пароля, система попросит задать свой.`,
      });
      setForm(false);
      setFio('');
      setPhone('');
      setLocs([]);
      setObjs([]);
      reload();
    } catch (e) {
      const c = (e as Error).message;
      toast({
        title:
          c === 'exists'
            ? 'Такой сотрудник уже есть'
            : c === 'role_not_allowed' || c === 'not_allowed'
              ? 'Недостаточно прав'
              : 'Не удалось создать',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const setManagerObjects = async (u: User, ids: string[]) => {
    await updateUser(u.id, { objects: ids }, current?.id);
    reload();
  };

  const toggleProject = async (u: User, key: string) => {
    const ids = objectsOfProject(key).map((o) => o.id);
    const has = ids.every((id) => (u.objects ?? []).includes(id));
    const next = has
      ? (u.objects ?? []).filter((id) => !ids.includes(id))
      : [...new Set([...(u.objects ?? []), ...ids])];
    await setManagerObjects(u, next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {onBack && (
        <CabinetBar
          crumbs={[
            { label: 'Кабинет', icon: 'LayoutGrid', onClick: onBack },
            { label: 'Руководители проектов', icon: 'Briefcase' },
          ]}
          backLabel="В кабинет"
          onBack={onBack}
        />
      )}

      <Panel
        title="Руководители проектов"
        note={`${managers.length} чел.`}
        className="min-h-0 flex-1"
        action={
          <Button
            size="sm"
            onClick={() => setForm(true)}
            className="ml-auto gap-1.5 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            <Icon name="UserPlus" size={14} />
            Создать
          </Button>
        }
      >
        {!managers.length ? (
          <Empty
            icon="Briefcase"
            title="Руководителей проектов пока нет"
            hint="Нажмите «Создать» — учётную запись заводит только директор."
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-y-auto">
            <div className="flex flex-col divide-y divide-border">
              {managers.map((u: User) => {
                const mine = u.objects ?? [];
                return (
                  <div key={u.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-sm bg-secondary text-accent">
                        <Icon name="Briefcase" size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-head text-[0.95em] uppercase tracking-[0.03em]">
                          {u.fio}
                        </span>
                        <span className="block truncate text-[0.78em] text-muted-foreground">
                          {ROLE_LABEL[u.role]}
                          {u.phone ? ` · ${u.phone}` : ''}
                        </span>
                      </span>
                      <span className="flex-none rounded-sm border border-border px-2 py-1 text-[0.74em] uppercase tracking-[0.08em] text-muted-foreground">
                        объектов {mine.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {projects.map((p) => {
                        const ids = objectsOfProject(p.key).map((o) => o.id);
                        const all = ids.length > 0 && ids.every((id) => mine.includes(id));
                        const some = !all && ids.some((id) => mine.includes(id));
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => toggleProject(u, p.key)}
                            title={`${p.key} · ${locTitle(locations, p.locationId)}`}
                            className={cn(
                              'flex max-w-[18rem] items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.78em] transition-colors',
                              all
                                ? 'border-accent bg-accent text-accent-foreground'
                                : some
                                  ? 'border-accent text-accent'
                                  : 'border-input hover:bg-secondary',
                            )}
                          >
                            <Icon
                              name={all ? 'CheckCheck' : some ? 'Check' : 'Plus'}
                              size={12}
                              className="flex-none"
                            />
                            <span className="truncate">
                              {p.key === NO_FIELD ? 'Без проекта' : p.key}
                            </span>
                            <span className="flex-none opacity-70">{p.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.2em] uppercase tracking-[0.03em]">
              Новый руководитель проекта
            </DialogTitle>
            <DialogDescription>
              Учётную запись руководителя проекта заводит только директор. Закрепите за ним
              объекты — работать он сможет только с ними.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Фамилия Имя Отчество
                </Label>
                <Input
                  value={fio}
                  onChange={(e) => setFio(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  className="rounded-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                  Телефон
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 900 000-00-00"
                  className="rounded-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Доступ к локациям
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {locations.map((l) => {
                  const on = locs.includes(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLocs((p) => toggle(p, l.id))}
                      className={cn(
                        'rounded-sm border px-2 py-1 text-[0.82em] transition-colors',
                        on
                          ? 'border-accent bg-accent text-accent-foreground'
                          : 'border-input hover:bg-secondary',
                      )}
                    >
                      {l.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
                Закрепить проекты и объекты
              </Label>
              <div className="flex flex-col gap-2">
                {projects.map((p) => {
                  const list = objectsOfProject(p.key);
                  const ids = list.map((o) => o.id);
                  const all = ids.every((id) => objs.includes(id));
                  return (
                    <div key={p.key} className="rounded-sm border border-border p-2">
                      <button
                        type="button"
                        onClick={() =>
                          setObjs((prev) =>
                            all
                              ? prev.filter((id) => !ids.includes(id))
                              : [...new Set([...prev, ...ids])],
                          )
                        }
                        className="flex w-full items-center gap-1.5 text-left text-[0.84em] font-head uppercase tracking-[0.04em]"
                      >
                        <Icon
                          name={all ? 'CheckSquare' : 'Square'}
                          size={14}
                          className="flex-none text-accent"
                        />
                        <span className="min-w-0 truncate">
                          {p.key === NO_FIELD ? 'Без проекта' : p.key}
                        </span>
                        <span className="ml-auto flex-none text-[0.9em] text-muted-foreground">
                          {list.length}
                        </span>
                      </button>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {list.map((o) => {
                          const on = objs.includes(o.id);
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => setObjs((prev) => toggle(prev, o.id))}
                              className={cn(
                                'max-w-[15rem] truncate rounded-sm border px-2 py-1 text-[0.78em] transition-colors',
                                on
                                  ? 'border-accent bg-accent text-accent-foreground'
                                  : 'border-input hover:bg-secondary',
                              )}
                            >
                              {o.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={create}
              disabled={busy}
              className="w-full gap-2 rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
            >
              <Icon
                name={busy ? 'Loader2' : 'UserPlus'}
                size={16}
                className={busy ? 'animate-spin' : ''}
              />
              {busy ? 'Создаём…' : 'Создать руководителя проекта'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectManagers;
