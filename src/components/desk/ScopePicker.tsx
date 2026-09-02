import { useMemo, useState } from 'react';
import Topbar from '@/components/desk/Topbar';
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
import { useObjects, NO_FIELD } from '@/data/store';
import { useLocations } from '@/data/locations';
import { useProfile, ROLE_LABEL, ROLE_ICON, ROLE_NOTE, Role, ROLE_ORDER } from '@/data/profile';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onReady: (locationId: string, project: string) => void;
  onBackToModules: () => void;
  onLogin: () => void;
}

const CAN_ADD_LOCATION: Role[] = ['pm', 'director'];

const ScopePicker = ({ onReady, onBackToModules, onLogin }: Props) => {
  const { list: objects } = useObjects();
  const { list: locations, add } = useLocations();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [loc, setLoc] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [name, setName] = useState('');
  const [roleSeen, setRoleSeen] = useState(!!profile.fio);

  const canAdd = CAN_ADD_LOCATION.includes(profile.role);
  const isInspector = profile.role === 'inspector';

  const countByLoc = useMemo(() => {
    const m = new Map<string, number>();
    objects.forEach((o) => m.set(o.location, (m.get(o.location) ?? 0) + 1));
    return m;
  }, [objects]);

  const projects = useMemo(() => {
    if (!loc) return [];
    const m = new Map<string, number>();
    objects
      .filter((o) => o.location === loc)
      .forEach((o) => {
        const key = o.field?.trim() || NO_FIELD;
        m.set(key, (m.get(key) ?? 0) + 1);
      });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
  }, [objects, loc]);

  const createLoc = async () => {
    const title = name.trim();
    if (title.length < 2) {
      toast({ title: 'Введите название локации', variant: 'destructive' });
      return;
    }
    await add({ id: '', title, icon: 'MapPin', note: '' });
    toast({ title: 'Локация создана', description: title });
    setName('');
    setForm(false);
  };

  const head = (
    <div className="flex flex-none items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={loc ? () => setLoc(null) : () => setRoleSeen(false)}
        className="flex items-center gap-1.5 text-[0.82em] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-accent"
      >
        <Icon name="ArrowLeft" size={15} />
        {loc ? 'Локации' : 'Должность'}
      </button>
      <span className="flex items-center gap-2">
        <span className="hidden font-head text-[0.82em] uppercase tracking-[0.08em] text-muted-foreground sm:inline">
          {profile.fio ? `${ROLE_LABEL[profile.role]} · ${profile.fio}` : 'Вход не выполнен'}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={onLogin}
          className="h-8 gap-1.5 rounded-sm px-3 text-[0.8em] uppercase tracking-[0.06em]"
        >
          <Icon name={profile.fio ? 'UserCog' : 'LogIn'} size={14} />
          {profile.fio ? 'Сменить' : 'Войти'}
        </Button>
      </span>
    </div>
  );

  if (!roleSeen) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
        <Topbar />
        <div className="flex flex-none items-center border-b border-border bg-card px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onBackToModules}
            className="flex items-center gap-1.5 text-[0.82em] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-accent"
          >
            <Icon name="ArrowLeft" size={15} />
            Модули
          </button>
        </div>

        <main className="scrollbar-thin flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-6 sm:px-6">
          <div className="w-full max-w-3xl animate-rise">
            <div className="flex items-center gap-2 text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              <span className="text-accent">Строительный контроль</span>
              <Icon name="ChevronRight" size={12} />
              <span className="text-foreground">Кто заходит</span>
            </div>

            <h1 className="mt-3 font-head text-[20px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[26px]">
              Кто заходит в модуль
            </h1>
            <p className="mt-1 text-[0.84em] text-muted-foreground">
              От должности зависят доступные разделы и права на правку данных
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {ROLE_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    if (!profile.fio) {
                      onLogin();
                      return;
                    }
                    setRoleSeen(true);
                  }}
                  className={cn(
                    'group flex items-start gap-3 rounded-sm border bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg',
                    profile.role === r ? 'border-accent' : 'border-border',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 flex-none items-center justify-center rounded-sm transition-colors',
                      profile.role === r
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary text-muted-foreground group-hover:text-accent',
                    )}
                  >
                    <Icon name={ROLE_ICON[r]} size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-head text-[0.98em] uppercase tracking-[0.03em]">
                      {ROLE_LABEL[r]}
                    </span>
                    <span className="mt-0.5 block text-[0.76em] leading-snug text-muted-foreground">
                      {ROLE_NOTE[r]}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {!profile.fio && (
              <p className="mt-4 rounded-sm border border-border bg-card px-3.5 py-3 text-[0.8em] text-muted-foreground">
                Выберите должность — откроется вход или регистрация под ней.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <Topbar />
      {head}

      <main className="scrollbar-thin flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-6 sm:px-6">
        <div className="w-full max-w-3xl animate-rise">
          <div className="flex items-center gap-2 text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
            <span className="text-accent">Строительный контроль</span>
            <Icon name="ChevronRight" size={12} />
            <span className={cn(!loc && 'text-foreground')}>Локация</span>
            {loc && (
              <>
                <Icon name="ChevronRight" size={12} />
                <span className="text-foreground">Проект</span>
              </>
            )}
          </div>

          {!loc ? (
            <>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <h1 className="font-head text-[20px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[26px]">
                    Выберите локацию
                  </h1>
                  <p className="mt-1 text-[0.84em] text-muted-foreground">
                    {isInspector
                      ? 'Откройте свою локацию — внутри проекты и объекты'
                      : 'Регион работ, внутри — проекты по месторождениям и городам'}
                  </p>
                </div>
                {canAdd && (
                  <Button
                    size="sm"
                    onClick={() => setForm(true)}
                    className="h-8 flex-none gap-1.5 rounded-sm bg-accent px-3 font-head text-[0.8em] uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
                  >
                    <Icon name="Plus" size={14} />
                    Локация
                  </Button>
                )}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {locations.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLoc(l.id)}
                    className="group flex items-center gap-3 rounded-sm border border-border bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
                  >
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                      <Icon name={l.icon} size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-head text-[1em] uppercase tracking-[0.03em]">
                        {l.title}
                      </span>
                      <span className="block text-[0.78em] text-muted-foreground">
                        {countByLoc.get(l.id) ?? 0} объектов
                      </span>
                    </span>
                    <Icon
                      name="ChevronRight"
                      size={17}
                      className="flex-none text-muted-foreground transition-colors group-hover:text-accent"
                    />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-3 font-head text-[20px] uppercase leading-[1.15] tracking-[0.02em] sm:text-[26px]">
                {locations.find((l) => l.id === loc)?.title}
              </h1>
              <p className="mt-1 text-[0.84em] text-muted-foreground">
                Проект — название месторождения или города, внутри список объектов
              </p>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => onReady(loc, '')}
                  className="group flex items-center gap-3 rounded-sm border border-accent/40 bg-accent/5 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent"
                >
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-accent text-accent-foreground">
                    <Icon name="LayoutGrid" size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-head text-[1em] uppercase tracking-[0.03em]">
                      Все проекты локации
                    </span>
                    <span className="block text-[0.78em] text-muted-foreground">
                      {countByLoc.get(loc) ?? 0} объектов · {projects.length} проектов
                    </span>
                  </span>
                  <Icon name="ChevronRight" size={17} className="flex-none text-accent" />
                </button>

                {projects.length === 0 ? (
                  <div className="rounded-sm border border-dashed border-border p-6 text-center">
                    <Icon
                      name="FolderOpen"
                      size={26}
                      className="mx-auto text-muted-foreground/50"
                    />
                    <p className="mt-2 font-head text-[0.95em] uppercase tracking-[0.03em]">
                      Проектов пока нет
                    </p>
                    <p className="mt-1 text-[0.8em] text-muted-foreground">
                      Объекты с проектами добавляет менеджер проекта в разделе «Объекты».
                    </p>
                  </div>
                ) : (
                  projects.map(([p, n]) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onReady(loc, p === NO_FIELD ? '' : p)}
                      className="group flex items-center gap-3 rounded-sm border border-border bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
                    >
                      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm bg-secondary text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                        <Icon name="Mountain" size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-head text-[1em] uppercase tracking-[0.03em]">
                          {p}
                        </span>
                        <span className="block text-[0.78em] text-muted-foreground">
                          {n} объектов
                        </span>
                      </span>
                      <Icon
                        name="ChevronRight"
                        size={17}
                        className="flex-none text-muted-foreground transition-colors group-hover:text-accent"
                      />
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="max-w-sm rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-head text-[1.15em] uppercase tracking-[0.03em]">
              Новая локация
            </DialogTitle>
            <DialogDescription className="text-[0.85em]">
              Регион или направление работ — например, Ямал или Проект котельные
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[0.75em] uppercase tracking-[0.1em] text-muted-foreground">
              Название
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="напр. Ямал"
              className="rounded-sm"
            />
          </div>
          <Button
            onClick={createLoc}
            className="w-full rounded-sm bg-accent font-head uppercase tracking-[0.06em] text-accent-foreground hover:bg-accent/90"
          >
            Создать
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScopePicker;